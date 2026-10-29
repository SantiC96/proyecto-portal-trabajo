/**
 * Datos de contacto de la Oficina de Empleo de la Municipalidad de Funes.
 * Es el único lugar donde están: el footer, el contacto del panel y las
 * preguntas frecuentes los leen de acá.
 */

type Dato = { texto: string; href: string };

const DIRECCION = "Tomás de la Torre 1726, Funes, Santa Fe";
const CORREO = "oficinaempleofunes@gmail.com";

export const OFICINA = {
  nombre: "Oficina de Empleo",
  direccion: {
    texto: DIRECCION,
    href: `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(DIRECCION)}`,
  },
  horario: { texto: "Lunes a viernes de 07:00 a 13:00 h" },
  telefono: { texto: "(0341) 493-1164", href: "tel:+543414931164" },
  correo: { texto: CORREO, href: `mailto:${CORREO}` },
  redes: {
    instagram: {
      texto: "Instagram",
      etiqueta: "Instagram de la Municipalidad de Funes",
      href: "https://www.instagram.com/gobiernodefunes/?hl=es",
    },
    facebook: {
      texto: "Facebook",
      etiqueta: "Facebook de la Municipalidad de Funes",
      href: "https://www.facebook.com/gobiernodefunes/?locale=es_LA",
    },
  },
} as const satisfies {
  nombre: string;
  direccion: Dato;
  horario: { texto: string };
  telefono: Dato;
  correo: Dato;
  redes: Record<string, Dato & { etiqueta: string }>;
};
