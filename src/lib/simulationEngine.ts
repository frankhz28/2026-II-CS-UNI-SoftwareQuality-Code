import {
  InfraComponent,
  Connection,
  Dataset,
  BackupCopy,
  FailureEvent,
  SimulationResult,
  ComponentStatus,
  RecoveryItem,
  RiskFinding,
} from '../types/resilient'

// Reglas de negocio del escenario
const PRIMARY_DATACENTER_ID = 'dc-lima'
const INTERCONNECTION_LINK_ID = 'conn-inter-fo'
const PRIMARY_REGION = 'Lima'
// Pérdida estimada: horas de RPO x ~2.5 GB de transacciones por hora
const ESTIMATED_GB_LOST_PER_RPO_HOUR = 2.5
const FULL_RECOVERY_PERCENTAGE = 100

interface FailedIds {
  failedComponentIds: Set<string>
  failedConnectionIds: Set<string>
}

interface DataRecoverySummary {
  recoveryDetails: RecoveryItem[]
  totalDataGb: number
  recoverableDataGb: number
  totalDataLossGb: number
  maxRtoMinutes: number
  maxRpoHours: number
}

interface ServiceStatusCounts {
  servicesTotal: number
  servicesAvailable: number
  servicesDegraded: number
  servicesDown: number
}

/** Copia profunda para no mutar el estado "antes" que el reporte compara. */
function cloneInfrastructure<T>(items: T[]): T[] {
  return JSON.parse(JSON.stringify(items)) as T[]
}

function collectExplicitFailures(failureEvents: FailureEvent[]): FailedIds {
  const failedComponentIds = new Set<string>()
  const failedConnectionIds = new Set<string>()

  failureEvents.forEach((event) => {
    if (event.type === 'link') {
      failedConnectionIds.add(event.targetId)
    } else {
      failedComponentIds.add(event.targetId)
    }
  })

  return { failedComponentIds, failedConnectionIds }
}

/** Si cae un centro de datos, caen todos los componentes que aloja. */
function propagateDatacenterFailures(
  components: InfraComponent[],
  failedComponentIds: Set<string>
): void {
  components.forEach((comp) => {
    if (comp.type === 'datacenter' && failedComponentIds.has(comp.id)) {
      comp.status = 'caido'
      components.forEach((child) => {
        if (child.datacenterId === comp.id) {
          failedComponentIds.add(child.id)
          child.status = 'caido'
        }
      })
    }
  })
}

function applyComponentStatuses(
  components: InfraComponent[],
  failedComponentIds: Set<string>
): void {
  components.forEach((comp) => {
    if (failedComponentIds.has(comp.id)) {
      comp.status = 'caido'
    }
  })
}

function isConnectionAffected(
  connection: Connection,
  { failedComponentIds, failedConnectionIds }: FailedIds
): boolean {
  return (
    failedConnectionIds.has(connection.id) ||
    failedComponentIds.has(connection.fromId) ||
    failedComponentIds.has(connection.toId)
  )
}

/** Un enlace afectado queda degradado si hay algún enlace redundante en pie; si no, cae. */
function applyConnectionStatuses(
  connections: Connection[],
  failedIds: FailedIds
): void {
  const { failedComponentIds, failedConnectionIds } = failedIds

  connections.forEach((conn) => {
    if (!isConnectionAffected(conn, failedIds)) {
      return
    }

    const redundantConn = connections.find(
      (c) =>
        c.id !== conn.id &&
        c.isRedundant &&
        !failedConnectionIds.has(c.id) &&
        !failedComponentIds.has(c.fromId) &&
        !failedComponentIds.has(c.toId)
    )

    conn.status = redundantConn ? 'degradado' : 'caido'
  })
}

/** Un servicio cae si falla cualquiera de sus dependencias. */
function applyServiceStatuses(
  components: InfraComponent[],
  connections: Connection[],
  failedComponentIds: Set<string>
): void {
  const hasDegradedLinks = () => connections.some((c) => c.status === 'degradado')

  components.forEach((comp) => {
    if (comp.type !== 'service') {
      return
    }

    const deps = comp.dependencies || []
    const hasFailedDependency = deps.some((depId) => failedComponentIds.has(depId))

    if (hasFailedDependency) {
      comp.status = 'caido'
    } else if (hasDegradedLinks()) {
      comp.status = 'degradado'
    }
  })
}

/** Un respaldo sirve si su almacenamiento sigue en pie. */
function findAccessibleBackup(
  dataset: Dataset,
  backups: BackupCopy[],
  components: InfraComponent[]
): BackupCopy | undefined {
  return backups
    .filter((b) => b.datasetId === dataset.id)
    .find((bk) => {
      const storageComp = components.find((c) => c.id === bk.storageComponentId)
      return storageComp && storageComp.status !== 'caido'
    })
}

function summarizeDataRecovery(
  datasets: Dataset[],
  backups: BackupCopy[],
  components: InfraComponent[]
): DataRecoverySummary {
  const recoveryDetails: RecoveryItem[] = []
  let totalDataGb = 0
  let recoverableDataGb = 0
  let totalDataLossGb = 0
  let maxRtoMinutes = 0
  let maxRpoHours = 0

  datasets.forEach((ds) => {
    totalDataGb += ds.sizeGb

    const accessibleBackup = findAccessibleBackup(ds, backups, components)
    const serviceComp = components.find((c) => c.id === ds.serviceId)
    const isServiceDown = serviceComp?.status === 'caido'

    if (accessibleBackup) {
      recoverableDataGb += ds.sizeGb
      maxRtoMinutes = Math.max(maxRtoMinutes, accessibleBackup.rtoMinutes)
      maxRpoHours = Math.max(maxRpoHours, accessibleBackup.rpoHours)

      const estimatedLoss = Math.round(
        accessibleBackup.rpoHours * ESTIMATED_GB_LOST_PER_RPO_HOUR
      )
      totalDataLossGb += estimatedLoss

      recoveryDetails.push({
        name: ds.name,
        type: 'dataset',
        statusAfter: isServiceDown ? 'caido' : 'operativo',
        backupAvailable: true,
        rtoMinutes: accessibleBackup.rtoMinutes,
        dataLossGb: estimatedLoss,
        observations: `Respaldo accesible en ${accessibleBackup.location}. Restauración estimada en ${accessibleBackup.rtoMinutes} min.`,
      })
    } else {
      totalDataLossGb += ds.sizeGb
      recoveryDetails.push({
        name: ds.name,
        type: 'dataset',
        statusAfter: 'caido',
        backupAvailable: false,
        rtoMinutes: 0,
        dataLossGb: ds.sizeGb,
        observations: `ALERTA CRÍTICA: No hay copias de respaldo accesibles. Todos los respaldos se encontraban en la zona afectada.`,
      })
    }
  })

  return {
    recoveryDetails,
    totalDataGb,
    recoverableDataGb,
    totalDataLossGb,
    maxRtoMinutes,
    maxRpoHours,
  }
}

/** Texto que acompaña a cada servicio en el detalle de recuperación. */
function describeServiceStatus(status: ComponentStatus): string {
  switch (status) {
    case 'caido':
      return 'Servicio interrumpido. Requiere failover y recuperación de datos.'
    case 'degradado':
      return 'Servicio operando a través de rutas de contingencia con latencia.'
    default:
      return 'Servicio 100% operativo sin afectación directa.'
  }
}

function buildServiceRecoveryItems(
  components: InfraComponent[],
  maxRtoMinutes: number
): RecoveryItem[] {
  return components
    .filter((c) => c.type === 'service')
    .map((svc) => ({
      name: svc.name,
      type: 'servicio' as const,
      statusAfter: svc.status,
      backupAvailable: svc.status !== 'caido',
      rtoMinutes: svc.status === 'caido' ? maxRtoMinutes : 0,
      dataLossGb: 0,
      observations: describeServiceStatus(svc.status),
    }))
}

/** SPOF: servidores y almacenamientos de la región primaria de los que depende algún servicio. */
function findSinglePointsOfFailure(components: InfraComponent[]): string[] {
  return components
    .filter((comp) => comp.type === 'server' || comp.type === 'storage')
    .filter((comp) => comp.location.includes(PRIMARY_REGION))
    .filter((comp) =>
      components.some(
        (c) => c.type === 'service' && c.dependencies?.includes(comp.id)
      )
    )
    .map((comp) => `${comp.name} (${comp.location})`)
}

function detectRiskFindings(
  { failedComponentIds, failedConnectionIds }: FailedIds,
  backups: BackupCopy[]
): RiskFinding[] {
  const findings: RiskFinding[] = []
  const primaryDatacenterDown = failedComponentIds.has(PRIMARY_DATACENTER_ID)

  if (primaryDatacenterDown) {
    findings.push({
      id: 'f-1',
      severity: 'alta',
      title: 'Ausencia de Alta Disponibilidad Activo-Activo',
      message:
        'El Centro de Datos Lima concentra todos los servidores primarios. Su caída provocó la indisponibilidad total de los servicios ciudadanos.',
    })
  }

  backups.forEach((bk) => {
    if (bk.location.includes(PRIMARY_REGION) && primaryDatacenterDown) {
      findings.push({
        id: `f-bk-${bk.id}`,
        severity: 'alta',
        title: 'Copia de respaldo en la misma zona afectada',
        message: `El respaldo '${bk.id}' estaba almacenado en Lima y quedó inaccesible al caer el centro de datos principal.`,
      })
    }
  })

  if (failedConnectionIds.has(INTERCONNECTION_LINK_ID)) {
    findings.push({
      id: 'f-link-1',
      severity: 'media',
      title: 'Ruta alternativa con degradación de ancho de banda',
      message:
        'El enlace satelital de contingencia mantuvo la conectividad pero con una reducción del 99% en capacidad de transferencia.',
    })
  }

  return findings
}

function countServiceStatuses(components: InfraComponent[]): ServiceStatusCounts {
  const services = components.filter((c) => c.type === 'service')
  const servicesDown = services.filter((s) => s.status === 'caido').length
  const servicesDegraded = services.filter((s) => s.status === 'degradado').length

  return {
    servicesTotal: services.length,
    servicesDown,
    servicesDegraded,
    servicesAvailable: services.length - servicesDown - servicesDegraded,
  }
}

function formatSimulationTimestamp(): string {
  return new Date().toLocaleString('es-PE', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function runDisasterSimulation(
  components: InfraComponent[],
  connections: Connection[],
  datasets: Dataset[],
  backups: BackupCopy[],
  failureEvents: FailureEvent[],
  scenarioName: string
): SimulationResult {
  const componentsAfter = cloneInfrastructure(components)
  const connectionsAfter = cloneInfrastructure(connections)

  // La propagación es secuencial: los enlaces dependen de los componentes caídos,
  // y los servicios de los enlaces ya degradados.
  const failedIds = collectExplicitFailures(failureEvents)
  propagateDatacenterFailures(componentsAfter, failedIds.failedComponentIds)
  applyComponentStatuses(componentsAfter, failedIds.failedComponentIds)
  applyConnectionStatuses(connectionsAfter, failedIds)
  applyServiceStatuses(componentsAfter, connectionsAfter, failedIds.failedComponentIds)

  const dataRecovery = summarizeDataRecovery(datasets, backups, componentsAfter)
  const recoveryDetails = [
    ...dataRecovery.recoveryDetails,
    ...buildServiceRecoveryItems(componentsAfter, dataRecovery.maxRtoMinutes),
  ]

  const serviceCounts = countServiceStatuses(componentsAfter)
  const componentsAffected = componentsAfter.filter(
    (c) => c.status === 'caido' || c.status === 'degradado'
  ).length

  const dataRecoverablePct =
    dataRecovery.totalDataGb > 0
      ? Math.round(
          (dataRecovery.recoverableDataGb / dataRecovery.totalDataGb) *
            FULL_RECOVERY_PERCENTAGE
        )
      : FULL_RECOVERY_PERCENTAGE

  return {
    id: `sim-${Date.now()}`,
    scenarioName,
    timestamp: formatSimulationTimestamp(),
    eventDescription: failureEvents.map((e) => e.name).join(', '),
    failureEvents,
    servicesTotal: serviceCounts.servicesTotal,
    servicesAvailable: serviceCounts.servicesAvailable,
    servicesDegraded: serviceCounts.servicesDegraded,
    servicesDown: serviceCounts.servicesDown,
    componentsTotal: componentsAfter.length,
    componentsAffected,
    dataTotalGb: dataRecovery.totalDataGb,
    dataRecoverableGb: dataRecovery.recoverableDataGb,
    dataLostGb: dataRecovery.totalDataLossGb,
    dataRecoverablePct,
    rtoEstimatedMinutes: dataRecovery.maxRtoMinutes,
    rpoEstimatedHours: dataRecovery.maxRpoHours,
    spofIdentified: findSinglePointsOfFailure(components),
    recoveryDetails,
    findings: detectRiskFindings(failedIds, backups),
    componentsBefore: components,
    componentsAfter,
    connectionsBefore: connections,
    connectionsAfter,
  }
}
