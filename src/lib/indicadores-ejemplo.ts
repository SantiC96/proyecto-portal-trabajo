import "server-only";

import type { PostulacionesPeriodo } from "@/lib/admin/indicadores";
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
// de la empresa muestran un año de uso ficticio en lugar de consultar la base.
//
// Los datos no son números sueltos: se arma una lista de postulaciones y
// derivaciones con fechas (siempre las mismas para cada mes) y se cuentan por
// período. Así cada período contiene al más corto y las tarjetas coinciden con
// los gráficos: el gráfico de postulaciones cuenta la misma lista por día,
// semana o mes. Una diferencia con la base: un resultado de la empresa
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
const OFERTAS_VIGENTES = 26;
/** Postulantes registrados que todavía no se postularon a nada. */
const POSTULANTES_SIN_POSTULACIONES = 57;

type PostulacionEjemplo = {
  creada: number;
  rubro: string;
  rechazadaOficina: number | null;
  derivada: number | null;
  /** Solo si fue derivada: el resultado de la empresa, si ya llegó. */
  resultadoEmpresa: "contratado" | "rechazado" | null;
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

/** Los 12 meses que terminan en el actual, en hora de Argentina. */
function mesesDeEjemplo(ahora: number): MesEjemplo[] {
  const hoy = new Date(ahora - DESFASE_ARGENTINA);
  const claveActual = hoy.getUTCFullYear() * 12 + hoy.getUTCMonth();
  let numero = 0;
  for (let clave = CLAVE_PRIMER_MES; clave < claveActual - 11; clave++) {
    numero += cantidadDelMes(clave);
  }
  // El mes actual lleva la parte de los días que pasaron (al menos 15).
  const inicioActual = inicioMesArgentina(Math.floor(claveActual / 12), claveActual % 12);
  const finActual = inicioMesArgentina(Math.floor(claveActual / 12), (claveActual % 12) + 1);
  const transcurrido = (ahora - inicioActual) / (finActual - inicioActual);
  return Array.from({ length: 12 }, (_, k) => {
    const clave = claveActual - 11 + k;
    const cantidad =
      k === 11
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
        creada,
        rubro: elegirRubro(rubro),
        rechazadaOficina: null,
        derivada: null,
        resultadoEmpresa: null,
        preEntrevista: null,
        cursoAsignado: null,
        cursoCompletado: null,
      };

      // 15 % no seleccionadas por la oficina, 45 % derivadas, el resto sigue en revisión.
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

/**
 * Lo mismo que postulaciones_por_periodo (migration_061): las postulaciones
 * desde `desde`, por día, semana o mes, con 0 en los que no tienen. "Todo"
 * empieza en el grupo de la primera postulación.
 */
function postulacionesPorPeriodo(
  postulaciones: PostulacionEjemplo[],
  desde: number,
  agrupacion: Agrupacion,
  ahora: number,
): PostulacionesPeriodo[] {
  const conteo = new Map<number, number>();
  let primera = ahora;
  for (const p of postulaciones) {
    if (p.creada < desde) continue;
    const grupo = inicioGrupo(p.creada, agrupacion);
    conteo.set(grupo, (conteo.get(grupo) ?? 0) + 1);
    primera = Math.min(primera, p.creada);
  }
  const filas: PostulacionesPeriodo[] = [];
  const ultimo = inicioGrupo(ahora, agrupacion);
  const desdeGrupo = inicioGrupo(Number.isFinite(desde) ? desde : primera, agrupacion);
  for (let g = desdeGrupo; g <= ultimo; g = grupoSiguiente(g, agrupacion)) {
    filas.push({ inicio: new Date(g).toISOString().slice(0, 10), cantidad: conteo.get(g) ?? 0 });
  }
  return filas;
}

/** Lo mismo que devuelven indicadores_portal, postulaciones_por_periodo y postulaciones_por_rubro. */
export function indicadoresPortalDeEjemplo(
  periodo: Periodo,
  ahora: number = Date.now(),
): {
  indicadores: FilaIndicadoresPortal;
  porPeriodo: PostulacionesPeriodo[];
  porRubro: FilaRpc<"postulaciones_por_rubro">[];
} {
  const desde = desdeMs(periodo, ahora);
  const meses = mesesDeEjemplo(ahora);
  const postulaciones = postulacionesDeEjemplo(ahora, meses);

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
    postulantes_registrados:
      Math.round(postulaciones.length * 0.6) + POSTULANTES_SIN_POSTULACIONES,
    empresas_aprobadas: EMPRESAS_APROBADAS,
    empresas_pendientes: EMPRESAS_PENDIENTES,
    empresas_rechazadas: EMPRESAS_RECHAZADAS,
    ofertas_vigentes: OFERTAS_VIGENTES,
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

  const porPeriodo = postulacionesPorPeriodo(
    postulaciones,
    desde,
    AGRUPACION_POR_PERIODO[periodo],
    ahora,
  );

  return { indicadores, porPeriodo, porRubro: rubrosDelPeriodo(nuevas) };
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
