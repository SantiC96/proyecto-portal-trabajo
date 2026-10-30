import "server-only";

import type {
  EstadoPostulacionesPeriodo,
  FilaSerie,
  IndicadoresComparados,
  UltimaPostulacion,
} from "@/lib/admin/indicadores";
import type { EstadoPostulacion } from "@/lib/admin/postulacion-estados";
import type { EstadoDerivacionEmpresa } from "@/lib/derivacion-estados";
import { inicioAnioArgentinaISO } from "@/lib/fechas";
import { AGRUPACION_POR_PERIODO, type Agrupacion, type Periodo } from "@/lib/indicadores-periodo";
import type {
  FilaIndicadoresEmpresa,
  FilaIndicadoresPorOfertaEmpresa,
  FilaIndicadoresPortal,
  FilaRpc,
} from "@/types/db";

// Modo de datos de ejemplo de los indicadores (docs/decisiones/032, punto 5).
// Con INDICADORES_DE_EJEMPLO=true, las pantallas de indicadores de la oficina y
// de la empresa muestran uso ficticio en lugar de consultar la base: dos años
// en la oficina (así "Este año" tiene con qué compararse) y unos meses de
// ofertas en la empresa.
//
// Los datos no son números sueltos: se arma una lista de postulaciones,
// derivaciones, registros de postulantes y ofertas publicadas con fechas
// (siempre las mismas para cada mes) y se cuentan por período. Así cada
// período contiene al más corto, las tarjetas coinciden con los gráficos (las
// series cuentan las mismas listas por día, semana o mes) y el período
// anterior se cuenta igual que el actual. Una diferencia con la base: un resultado de la empresa
// (contratación, rechazo, entrevista) se cuenta en el período de su
// derivación, no en el de su fecha. Con eso las contrataciones
// nunca superan a las derivaciones y "En proceso" nunca queda en cero a la
// fuerza, ni siquiera a principio de año.

export function indicadoresDeEjemplo(): boolean {
  return process.env.INDICADORES_DE_EJEMPLO === "true";
}

const HORA = 60 * 60 * 1000;
const DIA = 24 * HORA;
// Argentina está en UTC-3 todo el año.
const DESFASE_ARGENTINA = 3 * 60 * 60 * 1000;

/** Medianoche del día 1 del mes en Argentina, en ms UTC. `mes0` puede salirse de 0–11. */
function inicioMesArgentina(anio: number, mes0: number): number {
  return Date.UTC(anio, mes0, 1) + DESFASE_ARGENTINA;
}

/** Lo mismo que desdePeriodo, pero contado desde `ahora` (así se puede verificar con otras fechas). */
function desdeMs(periodo: Periodo, ahora: number): number {
  switch (periodo) {
    case "30d":
      return ahora - 30 * DIA;
    case "90d":
      return ahora - 90 * DIA;
    case "anio":
      return Date.parse(inicioAnioArgentinaISO(new Date(ahora)));
    case "todo":
      return -Infinity;
  }
}

/** Generador pseudoaleatorio con semilla: los mismos datos en cada carga. */
function aleatorio(semilla: number): () => number {
  let a = semilla >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Parte fraccionaria de n × alfa (alfa irracional): valores repartidos de
 * forma pareja en el tiempo, sin rachas. Decide qué postulaciones se derivan,
 * cómo terminan y cuáles van a un curso, para que cada período tenga las
 * mismas proporciones.
 */
function repartoParejo(n: number, alfa: number): number {
  return (n * alfa) % 1;
}
const ALFA_CAMINO = 0.6180339887498949;
const ALFA_RESULTADO = 0.4142135623730951;
const ALFA_CURSO = 0.2360679774997897;
const ALFA_PRE_ENTREVISTA = 0.3247179572447460;

/** Antes de `ahora`, o null: lo que todavía no pasó no se cuenta. */
function siYaPaso(fecha: number, ahora: number): number | null {
  return fecha <= ahora ? fecha : null;
}

function redondear1(valor: number): number {
  return Math.round(valor * 10) / 10;
}

function promedioDias(diferencias: number[]): number | null {
  if (diferencias.length === 0) return null;
  return redondear1(diferencias.reduce((s, d) => s + d, 0) / diferencias.length / DIA);
}

// ── Oficina ───────────────────────────────────────────────────────────────

// Postulaciones esperadas por mes del año (enero a diciembre): marzo alto por
// el inicio de clases y del año laboral, julio bajo por las vacaciones de
// invierno, y suba de septiembre a noviembre por las contrataciones de fin de año.
const BASE_POR_MES = [20, 28, 56, 46, 39, 33, 23, 35, 43, 49, 57, 36];

// Rubros reales de la base y su peso en las postulaciones.
const RUBROS: [string, number][] = [
  ["Comercio y Ventas", 22],
  ["Gastronomía", 17],
  ["Servicios Generales", 14],
  ["Logística y Transporte", 12],
  ["Administración", 10],
  ["Construcción", 8],
  ["Salud", 6],
  ["Informática y Tecnología", 5],
  ["Educación", 3],
  ["Seguridad", 3],
];
const PESO_RUBROS = RUBROS.reduce((s, [, peso]) => s + peso, 0);

/** Los 5 rubros con más postulaciones y "Otros rubros", como postulaciones_por_rubro con TOPE_RUBROS. */
const TOPE_RUBROS_EJEMPLO = 5;

// Fotos de hoy: no dependen del período, como en indicadores_portal.
const EMPRESAS_APROBADAS = 41;
const EMPRESAS_PENDIENTES = 4;
const EMPRESAS_RECHAZADAS = 7;

type PostulacionEjemplo = {
  /** Número fijo de la postulación (desde enero de 2024). */
  numero: number;
  creada: number;
  rubro: string;
  rechazadaOficina: number | null;
  derivada: number | null;
  /** Solo si fue derivada: el resultado de la empresa, si ya llegó. */
  resultadoEmpresa: "contratado" | "rechazado" | null;
  /** Solo entre las que siguen en revisión: el postulante la retiró, o la empresa retiró la oferta. */
  retiradaPostulante: number | null;
  ofertaRetirada: number | null;
  preEntrevista: number | null;
  cursoAsignado: number | null;
  cursoCompletado: number | null;
};

function elegirRubro(valor: number): string {
  let acumulado = valor * PESO_RUBROS;
  for (const [rubro, peso] of RUBROS) {
    acumulado -= peso;
    if (acumulado < 0) return rubro;
  }
  return RUBROS[0][0];
}

// Peso de cada día de la semana (domingo a sábado): menos actividad el fin de semana.
const PESO_DIA_SEMANA = [0.3, 1.05, 1.1, 1, 1, 0.9, 0.45];
// Las postulaciones llegan entre las 8 y las 22.
const HORA_PRIMERA = 8;
const HORA_ULTIMA = 22;

type Ranura = { desde: number; largo: number; orden: number; total: number };

/**
 * El momento del día en que cae cada postulación de [inicio, fin), en orden:
 * cada día pesa según el día de la semana con una variación fija (la semilla
 * es el día, así un día pesa lo mismo en cada carga) y se reparten las
 * `cantidad` postulaciones por resto mayor, para que la suma sea exacta.
 */
function ranurasDelMes(inicio: number, fin: number, cantidad: number): Ranura[] {
  const dias: { desde: number; hasta: number; peso: number }[] = [];
  for (let dia = inicio; dia < fin; dia += DIA) {
    const desde = dia + HORA_PRIMERA * HORA;
    const hasta = Math.min(dia + HORA_ULTIMA * HORA, fin);
    if (hasta <= desde) continue;
    const diaSemana = new Date(dia - DESFASE_ARGENTINA).getUTCDay();
    const variacion = 0.7 + 0.6 * aleatorio(Math.round(dia / DIA) * 31 + 7)();
    const parte = (hasta - desde) / ((HORA_ULTIMA - HORA_PRIMERA) * HORA);
    dias.push({ desde, hasta, peso: PESO_DIA_SEMANA[diaSemana] * variacion * parte });
  }
  // Muy temprano el primer día del mes no hay ningún día con horario: todo
  // cae entre la medianoche y ahora.
  if (dias.length === 0) dias.push({ desde: inicio, hasta: fin, peso: 1 });

  const pesoTotal = dias.reduce((s, d) => s + d.peso, 0);
  const exactas = dias.map((d) => (cantidad * d.peso) / pesoTotal);
  const enteras = exactas.map(Math.floor);
  let faltan = cantidad - enteras.reduce((s, n) => s + n, 0);
  const porResto = exactas
    .map((valor, k) => ({ k, resto: valor - enteras[k] }))
    .sort((a, b) => b.resto - a.resto || a.k - b.k);
  for (const { k } of porResto) {
    if (faltan-- <= 0) break;
    enteras[k]++;
  }

  return dias.flatMap((d, k) =>
    Array.from({ length: enteras[k] }, (_, orden) => ({
      desde: d.desde,
      largo: d.hasta - d.desde,
      orden,
      total: enteras[k],
    })),
  );
}

/** Postulaciones de un mes (`clave` = año × 12 + mes): la base del mes con una variación fija. */
function cantidadDelMes(clave: number): number {
  const variacion = Math.round((aleatorio(clave)() - 0.5) * 8);
  return Math.min(60, Math.max(15, BASE_POR_MES[clave % 12] + variacion));
}

// Las postulaciones se numeran desde enero de 2024, así cada una tiene siempre
// el mismo número y el reparto parejo sigue de un mes al siguiente.
const CLAVE_PRIMER_MES = 2024 * 12;

type MesEjemplo = { anio: number; mes0: number; cantidad: number; primerNumero: number };

/**
 * Meses de uso del portal de ejemplo. Dos años: así el período anterior de
 * "Este año" (los mismos días antes del 1 de enero) también tiene datos.
 */
const MESES_DE_HISTORIA = 24;

/** Los MESES_DE_HISTORIA meses que terminan en el actual, en hora de Argentina. */
function mesesDeEjemplo(ahora: number): MesEjemplo[] {
  const hoy = new Date(ahora - DESFASE_ARGENTINA);
  const claveActual = hoy.getUTCFullYear() * 12 + hoy.getUTCMonth();
  const primeraClave = claveActual - (MESES_DE_HISTORIA - 1);
  let numero = 0;
  for (let clave = CLAVE_PRIMER_MES; clave < primeraClave; clave++) {
    numero += cantidadDelMes(clave);
  }
  // El mes actual lleva la parte de los días que pasaron (al menos 15).
  const inicioActual = inicioMesArgentina(Math.floor(claveActual / 12), claveActual % 12);
  const finActual = inicioMesArgentina(Math.floor(claveActual / 12), (claveActual % 12) + 1);
  const transcurrido = (ahora - inicioActual) / (finActual - inicioActual);
  return Array.from({ length: MESES_DE_HISTORIA }, (_, k) => {
    const clave = primeraClave + k;
    const cantidad =
      k === MESES_DE_HISTORIA - 1
        ? Math.max(15, Math.round(cantidadDelMes(clave) * transcurrido))
        : cantidadDelMes(clave);
    const mes = { anio: Math.floor(clave / 12), mes0: clave % 12, cantidad, primerNumero: numero };
    numero += cantidad;
    return mes;
  });
}

function postulacionesDeEjemplo(ahora: number, meses: MesEjemplo[]): PostulacionEjemplo[] {
  const postulaciones: PostulacionEjemplo[] = [];
  const vaADerivarse = (numero: number) => {
    const camino = repartoParejo(numero, ALFA_CAMINO);
    return camino >= 0.15 && camino < 0.6;
  };
  // El resultado se reparte entre las derivadas (no entre todas las postulaciones)
  // para que cualquier período tenga contrataciones y rechazos en proporción.
  let ordenDerivada = 0;
  for (let numero = 0; numero < (meses[0]?.primerNumero ?? 0); numero++) {
    if (vaADerivarse(numero)) ordenDerivada++;
  }

  meses.forEach(({ anio, mes0, cantidad, primerNumero }, k) => {
    const inicio = inicioMesArgentina(anio, mes0);
    const fin = k === meses.length - 1 ? ahora : inicioMesArgentina(anio, mes0 + 1);
    const azar = aleatorio((anio * 12 + mes0) * 7919);
    const ranuras = ranurasDelMes(inicio, fin, cantidad);

    for (let j = 0; j < cantidad; j++) {
      // Siempre las mismas tiradas por postulación, para que una no cambie a las demás.
      const [posicion, rubro, demoraOficina, demoraDerivacion, demoraResultado] = [
        azar(),
        azar(),
        azar(),
        azar(),
        azar(),
      ];
      const [demoraPreEntrevista, demoraCurso, demoraCompleta] = [azar(), azar(), azar()];
      const numero = primerNumero + j;
      const camino = repartoParejo(numero, ALFA_CAMINO);
      const curso = repartoParejo(numero, ALFA_CURSO);

      const ranura = ranuras[j];
      const creada = ranura.desde + ((ranura.orden + posicion) / ranura.total) * ranura.largo;
      const p: PostulacionEjemplo = {
        numero,
        creada,
        rubro: elegirRubro(rubro),
        rechazadaOficina: null,
        derivada: null,
        resultadoEmpresa: null,
        retiradaPostulante: null,
        ofertaRetirada: null,
        preEntrevista: null,
        cursoAsignado: null,
        cursoCompletado: null,
      };

      // 15 % no seleccionadas por la oficina, 45 % derivadas, 8 % retiradas y el resto en revisión.
      if (camino < 0.15) {
        p.rechazadaOficina = siYaPaso(creada + (2 + demoraOficina * 5) * DIA, ahora);
      } else if (vaADerivarse(numero)) {
        const resultado = repartoParejo(ordenDerivada++, ALFA_RESULTADO);
        p.derivada = siYaPaso(creada + (2 + demoraDerivacion * 9) * DIA, ahora);
        const respondida =
          p.derivada !== null &&
          siYaPaso(p.derivada + (4 + demoraResultado * 6) * DIA, ahora) !== null;
        // De las derivadas: 30 % contratadas, 45 % no seleccionadas, 25 % sin respuesta.
        if (respondida && resultado < 0.3) p.resultadoEmpresa = "contratado";
        else if (respondida && resultado < 0.75) p.resultadoEmpresa = "rechazado";
      } else if (camino >= 0.95) {
        // 5 % la retira el postulante y 3 % queda cerrada porque la empresa
        // retiró la oferta; las demás siguen en revisión.
        p.retiradaPostulante = siYaPaso(creada + (1 + demoraOficina * 6) * DIA, ahora);
      } else if (camino >= 0.92) {
        p.ofertaRetirada = siYaPaso(creada + (3 + demoraDerivacion * 10) * DIA, ahora);
      }

      if (repartoParejo(numero, ALFA_PRE_ENTREVISTA) < 0.32) {
        p.preEntrevista = siYaPaso(creada + (1 + demoraPreEntrevista * 4) * DIA, ahora);
      }
      // 10 % va a un curso; un poco más de la mitad lo completa en 3 a 8 semanas.
      if (curso < 0.1) {
        p.cursoAsignado = siYaPaso(creada + (1 + demoraCurso * 5) * DIA, ahora);
        if (p.cursoAsignado !== null && curso < 0.056) {
          p.cursoCompletado = siYaPaso(p.cursoAsignado + (21 + demoraCompleta * 35) * DIA, ahora);
        }
      }

      postulaciones.push(p);
    }
  });

  return postulaciones;
}

function rubrosDelPeriodo(delPeriodo: PostulacionEjemplo[]): FilaRpc<"postulaciones_por_rubro">[] {
  const conteo = new Map<string, number>();
  for (const p of delPeriodo) conteo.set(p.rubro, (conteo.get(p.rubro) ?? 0) + 1);
  const ranking = [...conteo.entries()].sort(
    ([rubroA, a], [rubroB, b]) => b - a || rubroA.localeCompare(rubroB, "es"),
  );
  const filas = ranking
    .slice(0, TOPE_RUBROS_EJEMPLO)
    .map(([rubro, cantidad]) => ({ rubro, cantidad, es_otros: false }));
  const resto = ranking.slice(TOPE_RUBROS_EJEMPLO);
  if (resto.length > 0) {
    filas.push({
      rubro: "Otros rubros",
      cantidad: resto.reduce((s, [, cantidad]) => s + cantidad, 0),
      es_otros: true,
    });
  }
  return filas;
}

const enPeriodo = (fecha: number | null, desde: number): fecha is number =>
  fecha !== null && fecha >= desde;

/** En [desde, hasta): el período anterior. */
const enRango = (fecha: number | null, desde: number, hasta: number): fecha is number =>
  fecha !== null && fecha >= desde && fecha < hasta;

/** Primer día del día, la semana (lunes) o el mes de `momento` en Argentina, como fecha UTC sin hora. */
function inicioGrupo(momento: number, agrupacion: Agrupacion): number {
  const local = new Date(momento - DESFASE_ARGENTINA);
  const anio = local.getUTCFullYear();
  const mes0 = local.getUTCMonth();
  if (agrupacion === "mes") return Date.UTC(anio, mes0, 1);
  const dia = Date.UTC(anio, mes0, local.getUTCDate());
  return agrupacion === "dia" ? dia : dia - ((local.getUTCDay() + 6) % 7) * DIA;
}

function grupoSiguiente(inicio: number, agrupacion: Agrupacion): number {
  if (agrupacion === "dia") return inicio + DIA;
  if (agrupacion === "semana") return inicio + 7 * DIA;
  const d = new Date(inicio);
  return Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 1);
}

// ── Postulantes y ofertas ─────────────────────────────────────────────────

const ALFA_POSTULANTE = 0.7548776662466927;
const ALFA_SIN_POSTULAR = 0.5698402909980532;

/**
 * Fecha de registro de cada postulante. El 60 % de las postulaciones es la
 * primera de su postulante, que se registró de 1 a 11 días antes; además, por
 * cada 13 postulaciones más o menos, alguien se registró ese día y todavía no
 * se postuló a nada.
 */
function registrosDeEjemplo(postulaciones: PostulacionEjemplo[], ahora: number): number[] {
  const registros: number[] = [];
  for (const p of postulaciones) {
    const demora = aleatorio(p.numero * 31 + 99991)();
    if (repartoParejo(p.numero, ALFA_POSTULANTE) < 0.6) {
      registros.push(p.creada - (1 + demora * 10) * DIA);
    }
    if (repartoParejo(p.numero, ALFA_SIN_POSTULAR) < 0.075) {
      const registro = siYaPaso(p.creada + 0.5 * DIA, ahora);
      if (registro !== null) registros.push(registro);
    }
  }
  return registros;
}

type OfertaPortalEjemplo = {
  publicada: number;
  vence: number;
  /** Se cerró antes de vencer (se cubrió la vacante). */
  cerrada: number | null;
  rubros: string[];
};

/** Ofertas publicadas por cada postulación del mes: unas 20 por mes. */
const OFERTAS_POR_POSTULACION = 0.5;
const DURACIONES_OFERTA = [30, 45, 60];

function ofertasDeEjemplo(ahora: number, meses: MesEjemplo[]): OfertaPortalEjemplo[] {
  const ofertas: OfertaPortalEjemplo[] = [];
  meses.forEach(({ anio, mes0, cantidad }, k) => {
    const inicio = inicioMesArgentina(anio, mes0);
    const fin = k === meses.length - 1 ? ahora : inicioMesArgentina(anio, mes0 + 1);
    const n = Math.round(cantidad * OFERTAS_POR_POSTULACION);
    const azar = aleatorio((anio * 12 + mes0) * 104729);
    for (let j = 0; j < n; j++) {
      const [posicion, duracion, rubro, otroRubro, conDos, seCierra, cuando] = [
        azar(),
        azar(),
        azar(),
        azar(),
        azar(),
        azar(),
        azar(),
      ];
      const publicada = inicio + ((j + posicion) / n) * (fin - inicio);
      const dias = DURACIONES_OFERTA[Math.floor(duracion * DURACIONES_OFERTA.length)];
      const rubros = [elegirRubro(rubro)];
      // 30 % tiene un segundo rubro: cuenta en los dos, como en la base.
      const segundo = elegirRubro(otroRubro);
      if (conDos < 0.3 && segundo !== rubros[0]) rubros.push(segundo);
      ofertas.push({
        publicada,
        vence: publicada + dias * DIA,
        // 15 % se cierra antes de vencer.
        cerrada: seCierra < 0.15 ? siYaPaso(publicada + (0.3 + cuando * 0.6) * dias * DIA, ahora) : null,
        rubros,
      });
    }
  });
  return ofertas;
}

const esVigente = (o: OfertaPortalEjemplo, ahora: number) => o.vence > ahora && o.cerrada === null;

/** Lo mismo que contar_ofertas_vigentes_por_rubro (065): rubros con al menos una, por nombre. */
function ofertasPorRubroDeEjemplo(
  ofertas: OfertaPortalEjemplo[],
  ahora: number,
): FilaRpc<"contar_ofertas_vigentes_por_rubro">[] {
  const conteo = new Map<string, number>();
  for (const o of ofertas) {
    if (!esVigente(o, ahora)) continue;
    for (const r of o.rubros) conteo.set(r, (conteo.get(r) ?? 0) + 1);
  }
  return [...conteo.entries()]
    .sort(([a], [b]) => a.localeCompare(b, "es"))
    .map(([rubro, cantidad]) => {
      const indice = RUBROS.findIndex(([nombre]) => nombre === rubro);
      return {
        categoria_id: `0e1e0000-0000-4000-8000-${String(indice + 1).padStart(12, "0")}`,
        rubro,
        cantidad,
      };
    });
}

// ── Estado actual de una postulación ──────────────────────────────────────

type EstadoActual = {
  estado: EstadoPostulacion;
  estadoEmpresa: EstadoDerivacionEmpresa | null;
};

function estadoActual(p: PostulacionEjemplo, ahora: number): EstadoActual {
  if (p.rechazadaOficina !== null) return { estado: "rechazada_municipalidad", estadoEmpresa: null };
  if (p.retiradaPostulante !== null) return { estado: "retirada_postulante", estadoEmpresa: null };
  if (p.ofertaRetirada !== null) return { estado: "oferta_retirada", estadoEmpresa: null };
  if (p.derivada !== null) {
    return {
      estado: "derivada",
      estadoEmpresa: p.resultadoEmpresa ?? (ahora - p.derivada > 2 * DIA ? "en_proceso" : "pendiente"),
    };
  }
  // Recibida hasta que la oficina la abre: el primer día, salvo que ya tenga pre-entrevista.
  const recibida = ahora - p.creada < DIA && p.preEntrevista === null;
  return { estado: recibida ? "recibida" : "en_revision", estadoEmpresa: null };
}

/** Lo mismo que estado_postulaciones_periodo (066): las cinco suman las postulaciones nuevas. */
function estadoDelPeriodo(delPeriodo: PostulacionEjemplo[], ahora: number): EstadoPostulacionesPeriodo {
  const estado: EstadoPostulacionesPeriodo = {
    en_revision: 0,
    derivadas: 0,
    rechazadas: 0,
    retiradas: 0,
    de_ofertas_retiradas: 0,
  };
  for (const p of delPeriodo) {
    const actual = estadoActual(p, ahora);
    if (actual.estado === "recibida" || actual.estado === "en_revision") estado.en_revision++;
    else if (actual.estado === "rechazada_municipalidad") estado.rechazadas++;
    else if (actual.estado === "retirada_postulante") estado.retiradas++;
    else if (actual.estado === "oferta_retirada") estado.de_ofertas_retiradas++;
    else if (actual.estadoEmpresa === "rechazado") estado.rechazadas++;
    else estado.derivadas++;
  }
  return estado;
}

// Nombres y puestos inventados para "Últimas postulaciones".
const NOMBRES = [
  "Lucía Fernández",
  "Martín Gómez",
  "Sofía Ramírez",
  "Diego Acosta",
  "Valentina Sosa",
  "Joaquín Herrera",
  "Camila Benítez",
  "Tomás Medina",
  "Florencia Ruiz",
  "Nicolás Castro",
  "Agustina Molina",
  "Facundo Ríos",
  "Milagros Paz",
];
const PUESTOS: Record<string, [string, string]> = {
  "Comercio y Ventas": ["Vendedor/a de mostrador", "Cajero/a"],
  Gastronomía: ["Ayudante de cocina", "Mozo/a"],
  "Servicios Generales": ["Personal de limpieza", "Mantenimiento edilicio"],
  "Logística y Transporte": ["Repartidor/a", "Operario/a de depósito"],
  Administración: ["Auxiliar administrativo/a", "Recepcionista"],
  Construcción: ["Ayudante de albañil", "Pintor/a de obra"],
  Salud: ["Auxiliar de enfermería", "Cuidador/a domiciliario/a"],
  "Informática y Tecnología": ["Soporte técnico", "Desarrollador/a web junior"],
  Educación: ["Docente de apoyo escolar", "Auxiliar de jardín"],
  Seguridad: ["Vigilador/a", "Controlador/a de acceso"],
};

/** Como CANTIDAD_ULTIMAS de lib/admin/indicadores (acá sin importarlo: ese módulo importa este). */
const CANTIDAD_ULTIMAS = 5;

/** Las CANTIDAD_ULTIMAS postulaciones más recientes, sin id: no hay ficha que abrir. */
function ultimasDeEjemplo(postulaciones: PostulacionEjemplo[], ahora: number): UltimaPostulacion[] {
  return [...postulaciones]
    .sort((a, b) => b.creada - a.creada)
    .slice(0, CANTIDAD_ULTIMAS)
    .map((p) => ({
      id: null,
      fecha: new Date(p.creada).toISOString(),
      postulante: NOMBRES[p.numero % NOMBRES.length],
      puesto: PUESTOS[p.rubro]?.[p.numero % 2] ?? p.rubro,
      ...estadoActual(p, ahora),
    }));
}

// ── Series y comparación con el período anterior ──────────────────────────

type Eventos = {
  postulaciones: number[];
  contrataciones: number[];
  postulantes: number[];
  ofertas: number[];
};

/**
 * Lo mismo que series_indicadores (066): por día, semana o mes desde `desde`,
 * con 0 en los vacíos. "Todo" empieza en el grupo del primer evento.
 */
function serieDeEjemplo(
  eventos: Eventos,
  desde: number,
  agrupacion: Agrupacion,
  ahora: number,
): FilaSerie[] {
  const conteo = new Map<number, FilaSerie>();
  let primero = ahora;
  const sumar = (fecha: number, campo: Exclude<keyof FilaSerie, "inicio">) => {
    if (fecha < desde || fecha > ahora) return;
    const grupo = inicioGrupo(fecha, agrupacion);
    const fila = conteo.get(grupo) ?? {
      inicio: new Date(grupo).toISOString().slice(0, 10),
      postulaciones: 0,
      contrataciones: 0,
      postulantes_nuevos: 0,
      ofertas_publicadas: 0,
    };
    fila[campo]++;
    conteo.set(grupo, fila);
    primero = Math.min(primero, fecha);
  };
  for (const f of eventos.postulaciones) sumar(f, "postulaciones");
  for (const f of eventos.contrataciones) sumar(f, "contrataciones");
  for (const f of eventos.postulantes) sumar(f, "postulantes_nuevos");
  for (const f of eventos.ofertas) sumar(f, "ofertas_publicadas");

  const filas: FilaSerie[] = [];
  const ultimo = inicioGrupo(ahora, agrupacion);
  const desdeGrupo = inicioGrupo(Number.isFinite(desde) ? desde : primero, agrupacion);
  for (let g = desdeGrupo; g <= ultimo; g = grupoSiguiente(g, agrupacion)) {
    filas.push(
      conteo.get(g) ?? {
        inicio: new Date(g).toISOString().slice(0, 10),
        postulaciones: 0,
        contrataciones: 0,
        postulantes_nuevos: 0,
        ofertas_publicadas: 0,
      },
    );
  }
  return filas;
}

function tasa(contrataciones: number, postulaciones: number): number | null {
  return postulaciones === 0 ? null : redondear1((contrataciones * 100) / postulaciones);
}

/** Lo mismo que indicadores_comparados (066). */
function comparadosDeEjemplo(
  eventos: Eventos,
  derivaciones: number[],
  vigentes: number,
  desde: number,
  ahora: number,
): IndicadoresComparados {
  const actual = (lista: number[]) => lista.filter((f) => enPeriodo(f, desde)).length;
  const conAnterior = Number.isFinite(desde);
  const anteriorDesde = desde - (ahora - desde);
  const anterior = (lista: number[]) =>
    conAnterior ? lista.filter((f) => enRango(f, anteriorDesde, desde)).length : null;

  const postulaciones = actual(eventos.postulaciones);
  const contrataciones = actual(eventos.contrataciones);
  const postulacionesAnterior = anterior(eventos.postulaciones);
  const contratacionesAnterior = anterior(eventos.contrataciones);

  return {
    postulantes_registrados: eventos.postulantes.length,
    postulantes_nuevos: actual(eventos.postulantes),
    postulantes_nuevos_anterior: anterior(eventos.postulantes),
    ofertas_vigentes: vigentes,
    ofertas_publicadas: actual(eventos.ofertas),
    ofertas_publicadas_anterior: anterior(eventos.ofertas),
    postulaciones_nuevas: postulaciones,
    postulaciones_nuevas_anterior: postulacionesAnterior,
    derivaciones: actual(derivaciones),
    derivaciones_anterior: anterior(derivaciones),
    contrataciones,
    contrataciones_anterior: contratacionesAnterior,
    tasa_contratacion: tasa(contrataciones, postulaciones),
    tasa_contratacion_anterior:
      postulacionesAnterior === null || contratacionesAnterior === null
        ? null
        : tasa(contratacionesAnterior, postulacionesAnterior),
  };
}

/** Lo mismo que devuelven las funciones de indicadores de la Oficina (047, 065 y 066). */
export function indicadoresPortalDeEjemplo(
  periodo: Periodo,
  ahora: number = Date.now(),
): {
  indicadores: FilaIndicadoresPortal;
  comparados: IndicadoresComparados;
  series: FilaSerie[];
  estado: EstadoPostulacionesPeriodo;
  porRubro: FilaRpc<"postulaciones_por_rubro">[];
  ofertasPorRubro: FilaRpc<"contar_ofertas_vigentes_por_rubro">[];
  ultimas: UltimaPostulacion[];
} {
  const desde = desdeMs(periodo, ahora);
  const meses = mesesDeEjemplo(ahora);
  const postulaciones = postulacionesDeEjemplo(ahora, meses);
  const ofertas = ofertasDeEjemplo(ahora, meses);
  const vigentes = ofertas.filter((o) => esVigente(o, ahora)).length;

  // Un resultado de la empresa se cuenta en el período de su derivación
  // (ver el comentario del principio): la contratación lleva esa fecha.
  const derivadasTodas = postulaciones.filter((p) => p.derivada !== null);
  const eventos: Eventos = {
    postulaciones: postulaciones.map((p) => p.creada),
    contrataciones: derivadasTodas
      .filter((p) => p.resultadoEmpresa === "contratado")
      .map((p) => p.derivada as number),
    postulantes: registrosDeEjemplo(postulaciones, ahora),
    ofertas: ofertas.map((o) => o.publicada),
  };

  const nuevas = postulaciones.filter((p) => enPeriodo(p.creada, desde));
  const derivadas = postulaciones.filter((p) => enPeriodo(p.derivada, desde));
  const contrataciones = derivadas.filter((p) => p.resultadoEmpresa === "contratado").length;
  const rechazos = derivadas.filter((p) => p.resultadoEmpresa === "rechazado").length;
  const cursosAsignados = postulaciones.filter((p) => enPeriodo(p.cursoAsignado, desde)).length;
  // Un curso dura semanas: los completados se cuentan por su fecha, como en la
  // base, con tope en los asignados del período para no superarlos.
  const cursosCompletados = Math.min(
    cursosAsignados,
    postulaciones.filter((p) => enPeriodo(p.cursoCompletado, desde)).length,
  );

  const indicadores: FilaIndicadoresPortal = {
    postulantes_registrados: eventos.postulantes.length,
    empresas_aprobadas: EMPRESAS_APROBADAS,
    empresas_pendientes: EMPRESAS_PENDIENTES,
    empresas_rechazadas: EMPRESAS_RECHAZADAS,
    ofertas_vigentes: vigentes,
    postulaciones_nuevas: nuevas.length,
    derivaciones_empresas: derivadas.length,
    contrataciones,
    rechazos_empresas: rechazos,
    no_seleccionados_oficina: postulaciones.filter((p) => enPeriodo(p.rechazadaOficina, desde))
      .length,
    pre_entrevistas_realizadas: postulaciones.filter((p) => enPeriodo(p.preEntrevista, desde))
      .length,
    cursos_asignados: cursosAsignados,
    cursos_completados: cursosCompletados,
    tasa_contratacion:
      contrataciones + rechazos === 0
        ? null
        : redondear1((contrataciones * 100) / (contrataciones + rechazos)),
    dias_promedio_derivacion: promedioDias(
      derivadas.map((p) => (p.derivada as number) - p.creada),
    ),
  };

  return {
    indicadores,
    comparados: comparadosDeEjemplo(
      eventos,
      derivadasTodas.map((p) => p.derivada as number),
      vigentes,
      desde,
      ahora,
    ),
    series: serieDeEjemplo(eventos, desde, AGRUPACION_POR_PERIODO[periodo], ahora),
    estado: estadoDelPeriodo(nuevas, ahora),
    porRubro: rubrosDelPeriodo(nuevas),
    ofertasPorRubro: ofertasPorRubroDeEjemplo(ofertas, ahora),
    ultimas: ultimasDeEjemplo(postulaciones, ahora),
  };
}

// ── Empresa ───────────────────────────────────────────────────────────────

type OfertaEjemplo = {
  oferta_id: string;
  titulo: string;
  estado: FilaIndicadoresPorOfertaEmpresa["estado"];
  /** Días desde hoy; negativo = ya venció. Null si no se publicó o ya cerró. */
  venceEnDias: number | null;
  vacantes: number;
  /** Primera y última derivación, en días antes de hoy. */
  derivacionesDesdeDias: number;
  derivacionesHastaDias: number;
  /**
   * Resultado de cada derivación, de la más vieja a la más nueva: C contratado,
   * R no seleccionado, P sin respuesta. Una respuesta que caería en el futuro
   * queda sin respuesta.
   */
  resultados: string;
};

// En el orden de indicadores_por_oferta_empresa: la más nueva primero.
const OFERTAS_EMPRESA: OfertaEjemplo[] = [
  {
    oferta_id: "0e1e0000-0000-4000-8000-000000000005",
    titulo: "Atención al cliente (medio tiempo)",
    estado: "pendiente_aprobacion",
    venceEnDias: null,
    vacantes: 2,
    derivacionesDesdeDias: 0,
    derivacionesHastaDias: 0,
    resultados: "",
  },
  {
    oferta_id: "0e1e0000-0000-4000-8000-000000000004",
    titulo: "Repositor/a",
    estado: "activa",
    venceEnDias: 6,
    vacantes: 3,
    derivacionesDesdeDias: 68,
    derivacionesHastaDias: 3,
    resultados: "RRCRPRCRP",
  },
  {
    oferta_id: "0e1e0000-0000-4000-8000-000000000003",
    titulo: "Cajero/a",
    estado: "activa",
    venceEnDias: 19,
    vacantes: 5,
    derivacionesDesdeDias: 172,
    derivacionesHastaDias: 1,
    resultados: "RRCRRPRCRRRCRRCPP",
  },
  {
    oferta_id: "0e1e0000-0000-4000-8000-000000000002",
    titulo: "Ayudante de cocina",
    estado: "activa",
    venceEnDias: -9,
    vacantes: 2,
    derivacionesDesdeDias: 118,
    derivacionesHastaDias: 24,
    resultados: "RCRRPRC",
  },
  {
    oferta_id: "0e1e0000-0000-4000-8000-000000000001",
    titulo: "Administrativo/a contable",
    estado: "cerrada",
    venceEnDias: null,
    vacantes: 1,
    derivacionesDesdeDias: 330,
    derivacionesHastaDias: 268,
    resultados: "RRRCR",
  },
];

type DerivacionEjemplo = {
  creada: number;
  entrevista: boolean;
  contratada: number | null;
  rechazada: boolean;
};

function derivacionesDeOferta(
  oferta: OfertaEjemplo,
  indice: number,
  ahora: number,
): DerivacionEjemplo[] {
  const azar = aleatorio(4513 + indice * 101);
  const n = oferta.resultados.length;
  const tramo = oferta.derivacionesDesdeDias - oferta.derivacionesHastaDias;

  return [...oferta.resultados].map((resultado, k) => {
    const [corrimiento, demoraEntrevista, demoraResultado, conEntrevista] = [
      azar(),
      azar(),
      azar(),
      azar(),
    ];
    const diasAtras =
      oferta.derivacionesDesdeDias - (n === 1 ? 0 : (tramo * k) / (n - 1)) - corrimiento * 0.8;
    const creada = ahora - diasAtras * DIA;
    const diasEntrevista = 2 + demoraEntrevista * 4;
    const fechaResultado = siYaPaso(
      creada + (diasEntrevista + 3 + demoraResultado * 9) * DIA,
      ahora,
    );
    return {
      creada,
      // Todos los seleccionados pasaron por una entrevista; puede estar
      // coordinada para los próximos días.
      entrevista: resultado === "C" || conEntrevista < 0.65,
      contratada: resultado === "C" ? fechaResultado : null,
      rechazada: resultado === "R" && fechaResultado !== null,
    };
  });
}

/** Lo mismo que devuelven indicadores_empresa e indicadores_por_oferta_empresa. */
export function indicadoresEmpresaDeEjemplo(
  periodo: Periodo,
  ahora: number = Date.now(),
): {
  indicadores: FilaIndicadoresEmpresa;
  porOferta: FilaIndicadoresPorOfertaEmpresa[];
} {
  const desde = desdeMs(periodo, ahora);
  const ofertas = OFERTAS_EMPRESA.map((oferta, indice) => {
    const derivaciones = derivacionesDeOferta(oferta, indice, ahora);
    const delPeriodo = derivaciones.filter((d) => d.creada >= desde);
    const venceEn =
      oferta.venceEnDias === null
        ? null
        : new Date(ahora + oferta.venceEnDias * DIA).toISOString();
    return {
      oferta,
      delPeriodo,
      venceEn,
      cubiertas: Math.min(
        derivaciones.filter((d) => d.contratada !== null).length,
        oferta.vacantes,
      ),
    };
  });

  const porOferta: FilaIndicadoresPorOfertaEmpresa[] = ofertas.map(
    ({ oferta, delPeriodo, venceEn, cubiertas }) => ({
      oferta_id: oferta.oferta_id,
      titulo: oferta.titulo,
      estado: oferta.estado,
      vence_en: venceEn,
      vacantes: oferta.vacantes,
      cubiertas,
      derivados: delPeriodo.length,
      entrevistas: delPeriodo.filter((d) => d.entrevista).length,
      seleccionados: delPeriodo.filter((d) => d.contratada !== null).length,
    }),
  );

  const vigente = (o: (typeof ofertas)[number]) =>
    o.oferta.estado === "activa" && o.venceEn !== null && Date.parse(o.venceEn) > ahora;
  // Las vacantes cuentan solo en las ofertas que se publicaron.
  const publicadas = ofertas.filter(
    (o) => o.oferta.estado === "activa" || o.oferta.estado === "cerrada",
  );
  const delPeriodo = ofertas.flatMap((o) => o.delPeriodo);
  const contratadas = delPeriodo.filter((d) => d.contratada !== null);

  const indicadores: FilaIndicadoresEmpresa = {
    ofertas_totales: ofertas.length,
    ofertas_vigentes: ofertas.filter(vigente).length,
    ofertas_pendientes: ofertas.filter((o) => o.oferta.estado === "pendiente_aprobacion").length,
    ofertas_vencidas: ofertas.filter((o) => o.oferta.estado === "activa" && !vigente(o)).length,
    ofertas_cerradas: ofertas.filter((o) => o.oferta.estado === "cerrada").length,
    ofertas_rechazadas: ofertas.filter((o) => o.oferta.estado === "rechazada").length,
    vacantes_totales: publicadas.reduce((s, o) => s + o.oferta.vacantes, 0),
    vacantes_cubiertas: publicadas.reduce((s, o) => s + o.cubiertas, 0),
    candidatos_derivados: delPeriodo.length,
    entrevistas_coordinadas: delPeriodo.filter((d) => d.entrevista).length,
    seleccionados: contratadas.length,
    no_seleccionados: delPeriodo.filter((d) => d.rechazada).length,
    dias_promedio_contratacion: promedioDias(
      contratadas.map((d) => (d.contratada as number) - d.creada),
    ),
  };

  return { indicadores, porOferta };
}
