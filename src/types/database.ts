export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.18"
  }
  public: {
    Tables: {
      archivos_usuario: {
        Row: {
          activo: boolean
          ajuste_x: number
          ajuste_y: number
          ajuste_zoom: number
          creado_en: string
          desactivado_en: string | null
          eliminado_en: string | null
          id: string
          mime_type: string | null
          nombre_original: string
          ruta: string
          tamano: number
          tipo: string
          usuario_id: string
          verificacion_estado: string | null
          verificacion_motivo: string | null
          verificado_en: string | null
          verificado_por: string | null
        }
        Insert: {
          activo?: boolean
          ajuste_x?: number
          ajuste_y?: number
          ajuste_zoom?: number
          creado_en?: string
          desactivado_en?: string | null
          eliminado_en?: string | null
          id?: string
          mime_type?: string | null
          nombre_original: string
          ruta: string
          tamano: number
          tipo: string
          usuario_id: string
          verificacion_estado?: string | null
          verificacion_motivo?: string | null
          verificado_en?: string | null
          verificado_por?: string | null
        }
        Update: {
          activo?: boolean
          ajuste_x?: number
          ajuste_y?: number
          ajuste_zoom?: number
          creado_en?: string
          desactivado_en?: string | null
          eliminado_en?: string | null
          id?: string
          mime_type?: string | null
          nombre_original?: string
          ruta?: string
          tamano?: number
          tipo?: string
          usuario_id?: string
          verificacion_estado?: string | null
          verificacion_motivo?: string | null
          verificado_en?: string | null
          verificado_por?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "archivos_usuario_usuario_id_fkey"
            columns: ["usuario_id"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "archivos_usuario_verificado_por_fkey"
            columns: ["verificado_por"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["id"]
          },
        ]
      }
      asignaciones_curso: {
        Row: {
          abandonado_en: string | null
          asignado_por: string | null
          completado_en: string | null
          created_at: string
          curso_id: string
          estado: string
          id: string
          iniciado_en: string | null
          nota: string | null
          postulante_id: string
          updated_at: string
        }
        Insert: {
          abandonado_en?: string | null
          asignado_por?: string | null
          completado_en?: string | null
          created_at?: string
          curso_id: string
          estado?: string
          id?: string
          iniciado_en?: string | null
          nota?: string | null
          postulante_id: string
          updated_at?: string
        }
        Update: {
          abandonado_en?: string | null
          asignado_por?: string | null
          completado_en?: string | null
          created_at?: string
          curso_id?: string
          estado?: string
          id?: string
          iniciado_en?: string | null
          nota?: string | null
          postulante_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "asignaciones_curso_asignado_por_fkey"
            columns: ["asignado_por"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "asignaciones_curso_curso_id_fkey"
            columns: ["curso_id"]
            isOneToOne: false
            referencedRelation: "cursos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "asignaciones_curso_postulante_id_fkey"
            columns: ["postulante_id"]
            isOneToOne: false
            referencedRelation: "postulantes"
            referencedColumns: ["id"]
          },
        ]
      }
      candidatos_guardados: {
        Row: {
          created_at: string
          empresa_id: string
          id: string
          nota: string | null
          oferta_origen_id: string | null
          postulante_id: string
        }
        Insert: {
          created_at?: string
          empresa_id: string
          id?: string
          nota?: string | null
          oferta_origen_id?: string | null
          postulante_id: string
        }
        Update: {
          created_at?: string
          empresa_id?: string
          id?: string
          nota?: string | null
          oferta_origen_id?: string | null
          postulante_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "candidatos_guardados_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "candidatos_guardados_oferta_origen_id_fkey"
            columns: ["oferta_origen_id"]
            isOneToOne: false
            referencedRelation: "ofertas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "candidatos_guardados_postulante_id_fkey"
            columns: ["postulante_id"]
            isOneToOne: false
            referencedRelation: "postulantes"
            referencedColumns: ["id"]
          },
        ]
      }
      categorias: {
        Row: {
          id: string
          nombre: string
        }
        Insert: {
          id?: string
          nombre: string
        }
        Update: {
          id?: string
          nombre?: string
        }
        Relationships: []
      }
      cursos: {
        Row: {
          activo: boolean
          created_at: string
          descripcion: string | null
          id: string
          indicaciones: string | null
          link: string | null
          nombre: string
          updated_at: string
        }
        Insert: {
          activo?: boolean
          created_at?: string
          descripcion?: string | null
          id?: string
          indicaciones?: string | null
          link?: string | null
          nombre: string
          updated_at?: string
        }
        Update: {
          activo?: boolean
          created_at?: string
          descripcion?: string | null
          id?: string
          indicaciones?: string | null
          link?: string | null
          nombre?: string
          updated_at?: string
        }
        Relationships: []
      }
      derivaciones: {
        Row: {
          created_at: string
          estado_empresa: Database["public"]["Enums"]["estado_empresa"]
          fecha_entrevista: string | null
          fecha_respuesta: string | null
          id: string
          lugar_entrevista: string | null
          municipalidad_usuario_id: string | null
          nota_empresa: string | null
          nota_municipalidad: string | null
          postulacion_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          estado_empresa?: Database["public"]["Enums"]["estado_empresa"]
          fecha_entrevista?: string | null
          fecha_respuesta?: string | null
          id?: string
          lugar_entrevista?: string | null
          municipalidad_usuario_id?: string | null
          nota_empresa?: string | null
          nota_municipalidad?: string | null
          postulacion_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          estado_empresa?: Database["public"]["Enums"]["estado_empresa"]
          fecha_entrevista?: string | null
          fecha_respuesta?: string | null
          id?: string
          lugar_entrevista?: string | null
          municipalidad_usuario_id?: string | null
          nota_empresa?: string | null
          nota_municipalidad?: string | null
          postulacion_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "derivaciones_municipalidad_usuario_id_fkey"
            columns: ["municipalidad_usuario_id"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "derivaciones_postulacion_id_fkey"
            columns: ["postulacion_id"]
            isOneToOne: true
            referencedRelation: "postulaciones"
            referencedColumns: ["id"]
          },
        ]
      }
      emails_pendientes: {
        Row: {
          asunto: string
          bloqueado_hasta: string | null
          created_at: string
          destinatario: string
          enviado_en: string | null
          estado: string
          id: string
          intentos: number
          link: string | null
          mensaje: string
          notificacion_id: string | null
          proximo_intento: string
          tipo: string
          ultimo_error: string | null
          usuario_id: string | null
        }
        Insert: {
          asunto: string
          bloqueado_hasta?: string | null
          created_at?: string
          destinatario: string
          enviado_en?: string | null
          estado?: string
          id?: string
          intentos?: number
          link?: string | null
          mensaje: string
          notificacion_id?: string | null
          proximo_intento?: string
          tipo: string
          ultimo_error?: string | null
          usuario_id?: string | null
        }
        Update: {
          asunto?: string
          bloqueado_hasta?: string | null
          created_at?: string
          destinatario?: string
          enviado_en?: string | null
          estado?: string
          id?: string
          intentos?: number
          link?: string | null
          mensaje?: string
          notificacion_id?: string | null
          proximo_intento?: string
          tipo?: string
          ultimo_error?: string | null
          usuario_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "emails_pendientes_notificacion_id_fkey"
            columns: ["notificacion_id"]
            isOneToOne: true
            referencedRelation: "notificaciones"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "emails_pendientes_usuario_id_fkey"
            columns: ["usuario_id"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["id"]
          },
        ]
      }
      empresas: {
        Row: {
          created_at: string
          cuit: string
          descripcion: string | null
          estado_aprobacion: string
          fecha_decision: string | null
          id: string
          motivo_rechazo: string | null
          razon_social: string
          rubro: string
          usuario_id: string
        }
        Insert: {
          created_at?: string
          cuit?: string
          descripcion?: string | null
          estado_aprobacion?: string
          fecha_decision?: string | null
          id?: string
          motivo_rechazo?: string | null
          razon_social?: string
          rubro: string
          usuario_id: string
        }
        Update: {
          created_at?: string
          cuit?: string
          descripcion?: string | null
          estado_aprobacion?: string
          fecha_decision?: string | null
          id?: string
          motivo_rechazo?: string | null
          razon_social?: string
          rubro?: string
          usuario_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "empresas_usuario_id_fkey"
            columns: ["usuario_id"]
            isOneToOne: true
            referencedRelation: "usuarios"
            referencedColumns: ["id"]
          },
        ]
      }
      historial_aprobacion_empresa: {
        Row: {
          created_at: string
          empresa_id: string
          evento: string
          id: string
          motivo: string | null
          usuario_id: string | null
        }
        Insert: {
          created_at?: string
          empresa_id: string
          evento: string
          id?: string
          motivo?: string | null
          usuario_id?: string | null
        }
        Update: {
          created_at?: string
          empresa_id?: string
          evento?: string
          id?: string
          motivo?: string | null
          usuario_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "historial_aprobacion_empresa_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "historial_aprobacion_empresa_usuario_id_fkey"
            columns: ["usuario_id"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["id"]
          },
        ]
      }
      invitaciones_oferta: {
        Row: {
          creada_en: string
          estado: string
          id: string
          invitado_por: string | null
          motivo_rechazo: string | null
          oferta_id: string
          postulacion_id: string | null
          postulante_id: string
          respondida_en: string | null
          vencida_en: string | null
        }
        Insert: {
          creada_en?: string
          estado?: string
          id?: string
          invitado_por?: string | null
          motivo_rechazo?: string | null
          oferta_id: string
          postulacion_id?: string | null
          postulante_id: string
          respondida_en?: string | null
          vencida_en?: string | null
        }
        Update: {
          creada_en?: string
          estado?: string
          id?: string
          invitado_por?: string | null
          motivo_rechazo?: string | null
          oferta_id?: string
          postulacion_id?: string | null
          postulante_id?: string
          respondida_en?: string | null
          vencida_en?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "invitaciones_oferta_invitado_por_fkey"
            columns: ["invitado_por"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invitaciones_oferta_oferta_id_fkey"
            columns: ["oferta_id"]
            isOneToOne: false
            referencedRelation: "ofertas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invitaciones_oferta_postulacion_id_fkey"
            columns: ["postulacion_id"]
            isOneToOne: false
            referencedRelation: "postulaciones"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invitaciones_oferta_postulante_id_fkey"
            columns: ["postulante_id"]
            isOneToOne: false
            referencedRelation: "postulantes"
            referencedColumns: ["id"]
          },
        ]
      }
      notificaciones: {
        Row: {
          clave: string | null
          created_at: string
          id: string
          leida_en: string | null
          link: string | null
          mensaje: string
          tipo: string
          titulo: string
          usuario_id: string
        }
        Insert: {
          clave?: string | null
          created_at?: string
          id?: string
          leida_en?: string | null
          link?: string | null
          mensaje: string
          tipo: string
          titulo: string
          usuario_id: string
        }
        Update: {
          clave?: string | null
          created_at?: string
          id?: string
          leida_en?: string | null
          link?: string | null
          mensaje?: string
          tipo?: string
          titulo?: string
          usuario_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notificaciones_usuario_id_fkey"
            columns: ["usuario_id"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["id"]
          },
        ]
      }
      oferta_categorias: {
        Row: {
          categoria_id: string
          oferta_id: string
        }
        Insert: {
          categoria_id: string
          oferta_id: string
        }
        Update: {
          categoria_id?: string
          oferta_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "oferta_categorias_categoria_id_fkey"
            columns: ["categoria_id"]
            isOneToOne: false
            referencedRelation: "categorias"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "oferta_categorias_oferta_id_fkey"
            columns: ["oferta_id"]
            isOneToOne: false
            referencedRelation: "ofertas"
            referencedColumns: ["id"]
          },
        ]
      }
      oferta_vacantes: {
        Row: {
          cantidad: number
          oferta_id: string
          updated_at: string
        }
        Insert: {
          cantidad: number
          oferta_id: string
          updated_at?: string
        }
        Update: {
          cantidad?: number
          oferta_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "oferta_vacantes_oferta_id_fkey"
            columns: ["oferta_id"]
            isOneToOne: true
            referencedRelation: "ofertas"
            referencedColumns: ["id"]
          },
        ]
      }
      ofertas: {
        Row: {
          beneficios: string[]
          clave_envio: string | null
          contenido_editado_en: string | null
          created_at: string
          descripcion: string
          duracion_dias: number
          eliminada_en: string | null
          empresa_id: string | null
          empresa_nombre: string
          estado: Database["public"]["Enums"]["estado_oferta"]
          id: string
          jornada: Database["public"]["Enums"]["jornada_oferta"]
          modalidad: Database["public"]["Enums"]["modalidad_oferta"]
          motivo_rechazo: string | null
          publicado_en: string | null
          requisitos: string[]
          revisado_en: string | null
          revisado_por: string | null
          titulo: string
          ubicacion: string
          updated_at: string
          vence_en: string | null
        }
        Insert: {
          beneficios?: string[]
          clave_envio?: string | null
          contenido_editado_en?: string | null
          created_at?: string
          descripcion: string
          duracion_dias?: number
          eliminada_en?: string | null
          empresa_id?: string | null
          empresa_nombre: string
          estado?: Database["public"]["Enums"]["estado_oferta"]
          id?: string
          jornada?: Database["public"]["Enums"]["jornada_oferta"]
          modalidad?: Database["public"]["Enums"]["modalidad_oferta"]
          motivo_rechazo?: string | null
          publicado_en?: string | null
          requisitos?: string[]
          revisado_en?: string | null
          revisado_por?: string | null
          titulo: string
          ubicacion?: string
          updated_at?: string
          vence_en?: string | null
        }
        Update: {
          beneficios?: string[]
          clave_envio?: string | null
          contenido_editado_en?: string | null
          created_at?: string
          descripcion?: string
          duracion_dias?: number
          eliminada_en?: string | null
          empresa_id?: string | null
          empresa_nombre?: string
          estado?: Database["public"]["Enums"]["estado_oferta"]
          id?: string
          jornada?: Database["public"]["Enums"]["jornada_oferta"]
          modalidad?: Database["public"]["Enums"]["modalidad_oferta"]
          motivo_rechazo?: string | null
          publicado_en?: string | null
          requisitos?: string[]
          revisado_en?: string | null
          revisado_por?: string | null
          titulo?: string
          ubicacion?: string
          updated_at?: string
          vence_en?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ofertas_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
        ]
      }
      postulaciones: {
        Row: {
          created_at: string
          cv_archivo_id: string | null
          estado: Database["public"]["Enums"]["estado_postulacion"]
          id: string
          nota_oficina: string | null
          oferta_id: string
          origen: string
          postulante_id: string
          retirada_en: string | null
          revisado_por: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          cv_archivo_id?: string | null
          estado?: Database["public"]["Enums"]["estado_postulacion"]
          id?: string
          nota_oficina?: string | null
          oferta_id: string
          origen?: string
          postulante_id: string
          retirada_en?: string | null
          revisado_por?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          cv_archivo_id?: string | null
          estado?: Database["public"]["Enums"]["estado_postulacion"]
          id?: string
          nota_oficina?: string | null
          oferta_id?: string
          origen?: string
          postulante_id?: string
          retirada_en?: string | null
          revisado_por?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "postulaciones_cv_archivo_id_fkey"
            columns: ["cv_archivo_id"]
            isOneToOne: false
            referencedRelation: "archivos_usuario"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "postulaciones_oferta_id_fkey"
            columns: ["oferta_id"]
            isOneToOne: false
            referencedRelation: "ofertas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "postulaciones_postulante_id_fkey"
            columns: ["postulante_id"]
            isOneToOne: false
            referencedRelation: "postulantes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "postulaciones_revisado_por_fkey"
            columns: ["revisado_por"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["id"]
          },
        ]
      }
      postulante_categorias: {
        Row: {
          categoria_id: string
          postulante_id: string
        }
        Insert: {
          categoria_id: string
          postulante_id: string
        }
        Update: {
          categoria_id?: string
          postulante_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "postulante_categorias_categoria_id_fkey"
            columns: ["categoria_id"]
            isOneToOne: false
            referencedRelation: "categorias"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "postulante_categorias_postulante_id_fkey"
            columns: ["postulante_id"]
            isOneToOne: false
            referencedRelation: "postulantes"
            referencedColumns: ["id"]
          },
        ]
      }
      postulantes: {
        Row: {
          created_at: string
          disponibilidad: string | null
          dni: string | null
          domicilio: string | null
          es_de_funes: boolean
          experiencia_laboral: string | null
          id: string
          localidad: string | null
          nivel_educativo: string | null
          nivel_prioridad: number
          situacion_laboral: string | null
          usuario_id: string
        }
        Insert: {
          created_at?: string
          disponibilidad?: string | null
          dni?: string | null
          domicilio?: string | null
          es_de_funes?: boolean
          experiencia_laboral?: string | null
          id?: string
          localidad?: string | null
          nivel_educativo?: string | null
          nivel_prioridad?: number
          situacion_laboral?: string | null
          usuario_id: string
        }
        Update: {
          created_at?: string
          disponibilidad?: string | null
          dni?: string | null
          domicilio?: string | null
          es_de_funes?: boolean
          experiencia_laboral?: string | null
          id?: string
          localidad?: string | null
          nivel_educativo?: string | null
          nivel_prioridad?: number
          situacion_laboral?: string | null
          usuario_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "postulantes_usuario_id_fkey"
            columns: ["usuario_id"]
            isOneToOne: true
            referencedRelation: "usuarios"
            referencedColumns: ["id"]
          },
        ]
      }
      pre_entrevistas: {
        Row: {
          coordinada_por: string | null
          created_at: string
          estado: string
          fecha_hora: string
          id: string
          lugar: string
          nota_oficina: string | null
          postulacion_id: string
          updated_at: string
        }
        Insert: {
          coordinada_por?: string | null
          created_at?: string
          estado?: string
          fecha_hora: string
          id?: string
          lugar: string
          nota_oficina?: string | null
          postulacion_id: string
          updated_at?: string
        }
        Update: {
          coordinada_por?: string | null
          created_at?: string
          estado?: string
          fecha_hora?: string
          id?: string
          lugar?: string
          nota_oficina?: string | null
          postulacion_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "pre_entrevistas_coordinada_por_fkey"
            columns: ["coordinada_por"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pre_entrevistas_postulacion_id_fkey"
            columns: ["postulacion_id"]
            isOneToOne: true
            referencedRelation: "postulaciones"
            referencedColumns: ["id"]
          },
        ]
      }
      usuarios: {
        Row: {
          activo: boolean
          apellido: string
          created_at: string
          id: string
          nombre: string
          rol: Database["public"]["Enums"]["rol_usuario"]
          telefono: string
        }
        Insert: {
          activo?: boolean
          apellido: string
          created_at?: string
          id: string
          nombre: string
          rol: Database["public"]["Enums"]["rol_usuario"]
          telefono: string
        }
        Update: {
          activo?: boolean
          apellido?: string
          created_at?: string
          id?: string
          nombre?: string
          rol?: Database["public"]["Enums"]["rol_usuario"]
          telefono?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      activar_archivo_usuario: {
        Args: {
          p_mime_type: string
          p_nombre_original: string
          p_ruta: string
          p_tamano: number
          p_tipo: string
          p_usuario_id: string
        }
        Returns: undefined
      }
      actualizar_estado_mi_curso: {
        Args: { p_asignacion_id: string; p_estado: string }
        Returns: undefined
      }
      actualizar_mi_perfil_postulante:
        | {
            Args: {
              p_apellido: string
              p_dni: string
              p_domicilio: string
              p_nombre: string
              p_telefono: string
            }
            Returns: undefined
          }
        | {
            Args: {
              p_apellido: string
              p_disponibilidad: string
              p_dni: string
              p_domicilio: string
              p_experiencia_laboral: string
              p_nivel_educativo: string
              p_nombre: string
              p_situacion_laboral: string
              p_telefono: string
            }
            Returns: undefined
          }
      archivos_a_purgar: {
        Args: { p_limite?: number }
        Returns: {
          id: string
          ruta: string
          tipo: string
        }[]
      }
      archivos_dias_purga: { Args: never; Returns: number }
      avatares_de_candidatos_para_empresa: {
        Args: { p_postulante_ids: string[] }
        Returns: {
          ajuste_x: number
          ajuste_y: number
          ajuste_zoom: number
          postulante_id: string
          ruta: string
        }[]
      }
      bloquear_pre_entrevista: {
        Args: { p_pre_entrevista_id: string }
        Returns: Record<string, unknown>
      }
      buscar_candidatos_para_oferta: {
        Args: {
          p_limite?: number
          p_nivel?: number
          p_ocultar_rechazos?: boolean
          p_oferta_id: string
          p_offset?: number
          p_solo_con_cv?: boolean
          p_solo_funes?: boolean
        }
        Returns: {
          apellido: string
          coincide_titulo: boolean
          coincidencia: string
          disponibilidad_ok: boolean
          invitaciones_total: number
          localidad: string
          nivel_prioridad: number
          nombre: string
          postulante_id: string
          puntaje: number
          requisitos_coincidentes: string[]
          rubros_coincidentes: string[]
          tiene_cv: boolean
          total: number
          ultima_invitacion_estado: string
          ultima_invitacion_fecha: string
          ultima_invitacion_motivo: string
          usuario_id: string
          ya_invitado: boolean
        }[]
      }
      buscar_ofertas_publicas: {
        Args: {
          p_categoria?: string
          p_desplazamiento?: number
          p_limite?: number
          p_modalidad?: string
          p_q?: string
        }
        Returns: {
          beneficios: string[]
          categorias: string[]
          created_at: string
          descripcion: string
          empresa_nombre: string
          id: string
          jornada: string
          modalidad: string
          publicado_en: string
          requisitos: string[]
          titulo: string
          total_count: number
          ubicacion: string
        }[]
      }
      buscar_ofertas_publicas_multiple: {
        Args: {
          p_categorias?: string[]
          p_desplazamiento?: number
          p_limite?: number
          p_modalidades?: string[]
          p_q?: string
        }
        Returns: {
          beneficios: string[]
          categorias: string[]
          created_at: string
          descripcion: string
          empresa_nombre: string
          id: string
          jornada: string
          modalidad: string
          publicado_en: string
          requisitos: string[]
          titulo: string
          total_count: number
          ubicacion: string
        }[]
      }
      candidato_para_empresa: {
        Args: { p_postulante_id: string }
        Returns: {
          apellido: string
          cv_ruta: string
          disponibilidad: string
          email: string
          experiencia_laboral: string
          nivel_educativo: string
          nombre: string
          situacion_laboral: string
          telefono: string
        }[]
      }
      candidato_para_empresa_completo: {
        Args: { p_postulante_id: string }
        Returns: {
          apellido: string
          cv_ruta: string
          disponibilidad: string
          email: string
          experiencia_laboral: string
          foto_ruta: string
          nivel_educativo: string
          nombre: string
          rubros_interes: string[]
          situacion_laboral: string
          telefono: string
        }[]
      }
      categorias_validas_de_oferta: {
        Args: { p_categoria_ids: string[] }
        Returns: string[]
      }
      confirmar_archivos_purgados: {
        Args: { p_ids: string[] }
        Returns: number
      }
      contar_ofertas_por_modalidad: {
        Args: { p_categorias?: string[]; p_q?: string }
        Returns: {
          cantidad: number
          modalidad: string
        }[]
      }
      contar_postulantes_esperando_curso: { Args: never; Returns: number }
      contratados_en_oferta: { Args: { p_oferta_id: string }; Returns: number }
      coordinar_pre_entrevista: {
        Args: {
          p_fecha_hora: string
          p_lugar: string
          p_nota: string
          p_postulacion_id: string
        }
        Returns: string
      }
      crear_oferta_empresa: {
        Args: {
          p_beneficios: string[]
          p_cantidad_vacantes: number
          p_categoria_ids: string[]
          p_clave_envio: string
          p_descripcion: string
          p_duracion_dias: number
          p_jornada: Database["public"]["Enums"]["jornada_oferta"]
          p_modalidad: Database["public"]["Enums"]["modalidad_oferta"]
          p_requisitos: string[]
          p_titulo: string
          p_ubicacion: string
        }
        Returns: string
      }
      cv_de_candidato_empresa: {
        Args: { p_postulante_id: string }
        Returns: {
          nombre_original: string
          ruta: string
          subido_en: string
        }[]
      }
      cv_de_derivacion_empresa: {
        Args: { p_derivacion_id: string }
        Returns: {
          nombre_original: string
          ruta: string
          subido_en: string
        }[]
      }
      cv_de_postulacion: { Args: { p_postulacion_id: string }; Returns: string }
      cvs_de_mis_postulaciones: {
        Args: { p_postulacion_ids: string[] }
        Returns: {
          eliminado: boolean
          nombre_original: string
          postulacion_id: string
          subido_en: string
        }[]
      }
      cvs_maximo: { Args: never; Returns: number }
      derivaciones_de_oferta_empresa: {
        Args: { p_oferta_id: string }
        Returns: {
          derivacion_created_at: string
          derivacion_id: string
          derivacion_updated_at: string
          estado_empresa: Database["public"]["Enums"]["estado_empresa"]
          fecha_entrevista: string
          fecha_respuesta: string
          lugar_entrevista: string
          nota_municipalidad: string
          postulante_id: string
        }[]
      }
      derivaciones_de_postulante_empresa: {
        Args: { p_postulante_id: string }
        Returns: {
          derivacion_id: string
          estado_empresa: Database["public"]["Enums"]["estado_empresa"]
          fecha_respuesta: string
          oferta_id: string
          oferta_titulo: string
        }[]
      }
      derivaciones_sin_resultado_empresa: {
        Args: { p_dias: number }
        Returns: {
          apellido: string
          derivacion_id: string
          estado_empresa: Database["public"]["Enums"]["estado_empresa"]
          fecha_entrevista: string
          nombre: string
          oferta_id: string
          oferta_titulo: string
          postulante_id: string
        }[]
      }
      derivar_postulacion: {
        Args: { p_nota: string; p_postulacion_id: string }
        Returns: string
      }
      desactivar_cuenta_oficina: {
        Args: { p_usuario_id: string }
        Returns: boolean
      }
      disponibilidad_compatible: {
        Args: { p_disponibilidad: string; p_jornada: string }
        Returns: boolean
      }
      editar_oferta_empresa: {
        Args: {
          p_beneficios: string[]
          p_cantidad_vacantes: number
          p_categoria_ids: string[]
          p_descripcion: string
          p_duracion_dias: number
          p_jornada: Database["public"]["Enums"]["jornada_oferta"]
          p_modalidad: Database["public"]["Enums"]["modalidad_oferta"]
          p_oferta_id: string
          p_requisitos: string[]
          p_titulo: string
          p_ubicacion: string
        }
        Returns: undefined
      }
      eliminar_oferta: { Args: { p_oferta_id: string }; Returns: undefined }
      email_registrado: { Args: { p_email: string }; Returns: boolean }
      email_tipo_con_envio: { Args: { p_tipo: string }; Returns: boolean }
      emails_de_usuarios: {
        Args: { ids: string[] }
        Returns: {
          email: string
          id: string
        }[]
      }
      empresa_es_duena_de_oferta: {
        Args: { p_oferta_id: string }
        Returns: boolean
      }
      empresa_propietaria_de_derivacion: {
        Args: { p_derivacion_id: string }
        Returns: boolean
      }
      empresa_puede_ver_avatar: { Args: { p_ruta: string }; Returns: boolean }
      empresa_puede_ver_cv: { Args: { p_ruta: string }; Returns: boolean }
      empresas_email_sin_confirmar: {
        Args: never
        Returns: {
          empresa_id: string
        }[]
      }
      encolar_email: {
        Args: {
          p_asunto: string
          p_link: string
          p_mensaje: string
          p_notificacion_id: string
          p_tipo: string
          p_usuario_id: string
        }
        Returns: undefined
      }
      enviar_borrador_oferta: {
        Args: { p_oferta_id: string }
        Returns: undefined
      }
      estado_cursos_calculo: {
        Args: { p_postulante_ids: string[] }
        Returns: {
          asignacion_activa_estado: string
          asignacion_activa_id: string
          cursos_activos: number
          necesita_curso: boolean
          postulante_id: string
          puede_recibir_curso: boolean
          rechazos_totales: number
          rechazos_ventana: number
          ultima_asignacion_estado: string
          ultimo_completado_en: string
        }[]
      }
      estado_cursos_postulantes: {
        Args: { p_postulante_ids?: string[] }
        Returns: {
          asignacion_activa_estado: string
          asignacion_activa_id: string
          cursos_activos: number
          necesita_curso: boolean
          postulante_id: string
          puede_recibir_curso: boolean
          rechazos_totales: number
          rechazos_ventana: number
          ultima_asignacion_estado: string
          ultimo_completado_en: string
        }[]
      }
      estado_derivacion_postulante: {
        Args: { p_postulacion_id: string }
        Returns: {
          estado_empresa: Database["public"]["Enums"]["estado_empresa"]
          fecha_entrevista: string
          lugar_entrevista: string
        }[]
      }
      experiencia_tsv: { Args: { p_texto: string }; Returns: unknown }
      generar_avisos_vencimiento_empresa: {
        Args: { p_dias_aviso: number }
        Returns: number
      }
      guardar_borrador_oferta: {
        Args: {
          p_beneficios: string[]
          p_cantidad_vacantes: number
          p_categoria_ids: string[]
          p_clave_envio: string
          p_descripcion: string
          p_duracion_dias: number
          p_enviar?: boolean
          p_jornada: Database["public"]["Enums"]["jornada_oferta"]
          p_modalidad: Database["public"]["Enums"]["modalidad_oferta"]
          p_oferta_id: string
          p_requisitos: string[]
          p_titulo: string
          p_ubicacion: string
        }
        Returns: string
      }
      indicadores_empresa: {
        Args: { p_desde?: string }
        Returns: {
          candidatos_derivados: number
          dias_promedio_contratacion: number
          entrevistas_coordinadas: number
          no_seleccionados: number
          ofertas_cerradas: number
          ofertas_pendientes: number
          ofertas_rechazadas: number
          ofertas_totales: number
          ofertas_vencidas: number
          ofertas_vigentes: number
          seleccionados: number
          vacantes_cubiertas: number
          vacantes_totales: number
        }[]
      }
      indicadores_por_oferta_empresa: {
        Args: { p_desde?: string }
        Returns: {
          cubiertas: number
          derivados: number
          entrevistas: number
          estado: Database["public"]["Enums"]["estado_oferta"]
          oferta_id: string
          seleccionados: number
          titulo: string
          vacantes: number
          vence_en: string
        }[]
      }
      indicadores_portal: {
        Args: { p_desde?: string }
        Returns: {
          contrataciones: number
          cursos_asignados: number
          cursos_completados: number
          derivaciones_empresas: number
          dias_promedio_derivacion: number
          empresas_aprobadas: number
          empresas_pendientes: number
          empresas_rechazadas: number
          no_seleccionados_oficina: number
          ofertas_vigentes: number
          postulaciones_nuevas: number
          postulantes_registrados: number
          pre_entrevistas_realizadas: number
          rechazos_empresas: number
          tasa_contratacion: number
        }[]
      }
      indicadores_postulante: {
        Args: never
        Returns: {
          contratadas: number
          derivadas_sin_resultado: number
          en_revision: number
          invitaciones_pendientes: number
          no_seleccionadas: number
          postulaciones_activas: number
          retiradas: number
        }[]
      }
      invitar_a_oferta: {
        Args: { p_oferta_id: string; p_postulante_id: string }
        Returns: string
      }
      lexemas_coinciden: {
        Args: { p_lexemas: string[]; p_lexemas_experiencia: string[] }
        Returns: boolean
      }
      lexemas_significativos: { Args: { p_texto: string }; Returns: string[] }
      listar_cuentas_oficina: {
        Args: never
        Returns: {
          activo: boolean
          apellido: string
          creado_en: string
          email: string
          id: string
          nombre: string
          ultimo_ingreso: string
        }[]
      }
      localidad_clave: { Args: { p_localidad: string }; Returns: string }
      localidad_es_funes: { Args: { p_localidad: string }; Returns: boolean }
      mi_empresa_id: { Args: never; Returns: string }
      mis_cursos_asignados: {
        Args: never
        Returns: {
          asignacion_id: string
          asignado_en: string
          curso_id: string
          descripcion: string
          indicaciones: string
          link: string
          nombre: string
        }[]
      }
      mis_cursos_con_estado: {
        Args: never
        Returns: {
          abandonado_en: string
          asignacion_id: string
          asignado_en: string
          completado_en: string
          curso_id: string
          descripcion: string
          estado: string
          indicaciones: string
          iniciado_en: string
          link: string
          nombre: string
          por_rechazos: boolean
        }[]
      }
      mis_invitaciones: {
        Args: never
        Returns: {
          creada_en: string
          empresa_nombre: string
          estado: string
          id: string
          motivo_rechazo: string
          oferta_disponible: boolean
          oferta_id: string
          oferta_titulo: string
          postulacion_id: string
          respondida_en: string
          vencida_en: string
        }[]
      }
      mis_pre_entrevistas: {
        Args: { p_postulacion_ids: string[] }
        Returns: {
          estado: string
          fecha_hora: string
          lugar: string
          postulacion_id: string
        }[]
      }
      nivel_prioridad: { Args: { p_postulante_id: string }; Returns: number }
      nivel_prioridad_calculado: {
        Args: { p_es_de_funes: boolean; p_usuario_id: string }
        Returns: number
      }
      normalizar_busqueda: { Args: { p_texto: string }; Returns: string }
      notificaciones_fecha: {
        Args: { p_con_hora?: boolean; p_momento: string }
        Returns: string
      }
      notificaciones_marca: { Args: { p_momento: string }; Returns: string }
      notificar_oficina: {
        Args: {
          p_clave: string
          p_link: string
          p_mensaje: string
          p_tipo: string
          p_titulo: string
        }
        Returns: undefined
      }
      notificar_usuario: {
        Args: {
          p_clave: string
          p_link: string
          p_mensaje: string
          p_tipo: string
          p_titulo: string
          p_usuario_id: string
        }
        Returns: undefined
      }
      oferta_acepta_postulaciones: {
        Args: { p_oferta_id: string }
        Returns: boolean
      }
      oferta_campos_faltantes: {
        Args: {
          p_descripcion: string
          p_duracion_dias: number
          p_jornada: Database["public"]["Enums"]["jornada_oferta"]
          p_modalidad: Database["public"]["Enums"]["modalidad_oferta"]
          p_oferta_id: string
          p_requisitos: string[]
          p_titulo: string
        }
        Returns: string[]
      }
      oferta_sin_postulaciones: {
        Args: { p_oferta_id: string }
        Returns: boolean
      }
      oferta_tiene_requisito: {
        Args: { p_requisitos: string[] }
        Returns: boolean
      }
      ofertas_con_candidatos_pendientes: {
        Args: never
        Returns: {
          oferta_id: string
        }[]
      }
      ofertas_de_mis_postulaciones: {
        Args: { p_postulacion_ids: string[] }
        Returns: {
          empresa_nombre: string
          oferta_id: string
          postulacion_id: string
          titulo: string
        }[]
      }
      ofertas_dias_restauracion: { Args: never; Returns: number }
      ofertas_recomendadas_para_mi: {
        Args: { p_limite?: number }
        Returns: {
          coincide_titulo: boolean
          disponibilidad_ok: boolean
          empresa_nombre: string
          id: string
          lugar: string
          modalidad: Database["public"]["Enums"]["modalidad_oferta"]
          nivel: string
          puntaje: number
          requisitos_coincidentes: string[]
          rubros_coincidentes: string[]
          tiene_cv: boolean
          titulo: string
          vence_en: string
        }[]
      }
      parametros_cursos: {
        Args: never
        Returns: {
          umbral_rechazos: number
          ventana_dias: number
        }[]
      }
      postulacion_en_curso: {
        Args: {
          p_estado: Database["public"]["Enums"]["estado_postulacion"]
          p_estado_empresa: Database["public"]["Enums"]["estado_empresa"]
        }
        Returns: boolean
      }
      postulaciones_no_seleccionadas: {
        Args: never
        Returns: {
          apellido: string
          dni: string
          empresa_nombre: string
          fecha_rechazo: string
          nombre: string
          oferta_id: string
          oferta_titulo: string
          postulacion_id: string
          postulante_id: string
          rechazado_por: string
          usuario_id: string
        }[]
      }
      postulaciones_por_mes: {
        Args: never
        Returns: {
          cantidad: number
          mes: string
        }[]
      }
      postulaciones_por_periodo: {
        Args: { p_agrupacion?: string; p_desde?: string }
        Returns: {
          cantidad: number
          inicio: string
        }[]
      }
      postulaciones_por_rubro: {
        Args: { p_desde?: string; p_limite?: number }
        Returns: {
          cantidad: number
          es_otros: boolean
          rubro: string
        }[]
      }
      postulante_fue_derivado_a_empresa: {
        Args: { p_empresa_id: string; p_postulante_id: string }
        Returns: boolean
      }
      postulante_puede_ver_comprobante: {
        Args: { p_ruta: string }
        Returns: boolean
      }
      postulante_puede_ver_cv: { Args: { p_ruta: string }; Returns: boolean }
      postulantes_esperando_curso_ids: {
        Args: never
        Returns: {
          postulante_id: string
        }[]
      }
      procesos_abiertos_de_oferta: {
        Args: { p_oferta_id: string }
        Returns: {
          derivacion_id: string
          postulacion_id: string
        }[]
      }
      procesos_abiertos_ofertas_empresa: {
        Args: { p_oferta_ids: string[] }
        Returns: {
          candidatos_derivados: number
          oferta_id: string
          postulaciones_oficina: number
        }[]
      }
      puntaje_coincidencia: {
        Args: { p_oferta_id: string; p_postulante_id: string }
        Returns: {
          coincide_titulo: boolean
          disponibilidad_ok: boolean
          nivel: string
          puntaje: number
          requisitos_coincidentes: string[]
          rubros_coincidentes: string[]
          tiene_cv: boolean
        }[]
      }
      purgar_ofertas_eliminadas: { Args: never; Returns: number }
      reactivar_cuenta_oficina: {
        Args: { p_usuario_id: string }
        Returns: boolean
      }
      rechazos_desde_ultimo_curso: {
        Args: { p_postulante_id: string }
        Returns: number
      }
      rechazos_por_postulantes: {
        Args: { p_postulante_ids: string[] }
        Returns: {
          postulante_id: string
          rechazos: number
        }[]
      }
      reclamar_emails_pendientes: {
        Args: { p_limite: number }
        Returns: {
          asunto: string
          destinatario: string
          id: string
          intentos: number
          link: string
          mensaje: string
          tipo: string
        }[]
      }
      reemplazar_mis_rubros: {
        Args: { p_categoria_ids: string[] }
        Returns: undefined
      }
      reenviar_solicitud_empresa: {
        Args: {
          p_apellido: string
          p_cuit: string
          p_descripcion: string
          p_nombre: string
          p_razon_social: string
          p_rubro: string
          p_telefono: string
        }
        Returns: undefined
      }
      refrescar_nivel_prioridad: {
        Args: { p_usuario_id: string }
        Returns: undefined
      }
      registrar_resultado_pre_entrevista: {
        Args: {
          p_nota: string
          p_pre_entrevista_id: string
          p_resultado: string
        }
        Returns: undefined
      }
      renovar_oferta: { Args: { p_oferta_id: string }; Returns: string }
      reprogramar_pre_entrevista: {
        Args: {
          p_fecha_hora: string
          p_lugar: string
          p_nota: string
          p_pre_entrevista_id: string
        }
        Returns: undefined
      }
      responder_invitacion: {
        Args: {
          p_acepta: boolean
          p_cv_archivo_id?: string
          p_invitacion_id: string
          p_motivo?: string
        }
        Returns: string
      }
      restaurar_oferta: {
        Args: { p_oferta_id: string }
        Returns: Database["public"]["Enums"]["estado_oferta"]
      }
      resumen_invitaciones_oferta: {
        Args: { p_oferta_id: string }
        Returns: {
          aceptaron: number
          invitados: number
          rechazaron: number
          sin_respuesta: number
          vencidas: number
        }[]
      }
      retirar_oferta: { Args: { p_oferta_id: string }; Returns: number }
      retirar_postulacion: {
        Args: { p_postulacion_id: string }
        Returns: string
      }
      revisar_comprobante_domicilio: {
        Args: { p_aprobar: boolean; p_archivo_id: string; p_motivo?: string }
        Returns: undefined
      }
      rol_actual: {
        Args: never
        Returns: Database["public"]["Enums"]["rol_usuario"]
      }
      ultimos_movimientos_postulante: {
        Args: { p_limite?: number }
        Returns: {
          empresa_nombre: string
          estado: Database["public"]["Enums"]["estado_postulacion"]
          estado_empresa: Database["public"]["Enums"]["estado_empresa"]
          fecha: string
          fecha_entrevista: string
          oferta_id: string
          postulacion_id: string
          titulo: string
        }[]
      }
      validar_datos_pre_entrevista: {
        Args: { p_fecha_hora: string; p_lugar: string; p_nota: string }
        Returns: undefined
      }
      vencer_invitaciones_de_ofertas_vencidas: { Args: never; Returns: number }
    }
    Enums: {
      estado_empresa:
        | "pendiente"
        | "en_proceso"
        | "contratado"
        | "rechazado"
        | "oferta_retirada"
        | "retirada_postulante"
      estado_oferta:
        | "borrador"
        | "activa"
        | "cerrada"
        | "pendiente_aprobacion"
        | "rechazada"
      estado_postulacion:
        | "recibida"
        | "en_revision"
        | "derivada"
        | "rechazada_municipalidad"
        | "oferta_retirada"
        | "retirada_postulante"
      jornada_oferta:
        | "Tiempo completo"
        | "Part-time"
        | "Pasantía"
        | "Por proyecto"
      modalidad_oferta: "Presencial" | "Híbrido" | "Remoto"
      rol_usuario: "postulante" | "empresa" | "municipalidad"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      estado_empresa: [
        "pendiente",
        "en_proceso",
        "contratado",
        "rechazado",
        "oferta_retirada",
        "retirada_postulante",
      ],
      estado_oferta: [
        "borrador",
        "activa",
        "cerrada",
        "pendiente_aprobacion",
        "rechazada",
      ],
      estado_postulacion: [
        "recibida",
        "en_revision",
        "derivada",
        "rechazada_municipalidad",
        "oferta_retirada",
        "retirada_postulante",
      ],
      jornada_oferta: [
        "Tiempo completo",
        "Part-time",
        "Pasantía",
        "Por proyecto",
      ],
      modalidad_oferta: ["Presencial", "Híbrido", "Remoto"],
      rol_usuario: ["postulante", "empresa", "municipalidad"],
    },
  },
} as const
