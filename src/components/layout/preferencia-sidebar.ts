/**
 * Preferencia "menú contraído" de la sidebar de escritorio. Se guarda en
 * localStorage y se aplica como atributo en <html>: el layout raíz corre
 * SCRIPT_PREFERENCIA_SIDEBAR en el <head>, antes de pintar, así la sidebar ya
 * sale con el ancho correcto al recargar. El CSS lee el atributo; los
 * componentes, el hook de use-sidebar-colapsada.ts.
 *
 * Sin "use client" a propósito: el layout raíz (servidor) importa el script.
 */
export const CLAVE_SIDEBAR = "ftl-sidebar-colapsada";
export const ATRIBUTO_SIDEBAR = "data-sidebar";
/** Mientras está puesto, el ancho y los textos se animan (solo al alternar, no al cargar). */
export const ATRIBUTO_SIDEBAR_ANIMANDO = "data-sidebar-animando";

export const SCRIPT_PREFERENCIA_SIDEBAR = `(function(){try{if(localStorage.getItem("${CLAVE_SIDEBAR}")==="1")document.documentElement.setAttribute("${ATRIBUTO_SIDEBAR}","colapsada")}catch(e){}})()`;
