-- ============================================================
-- Seed: ofertas laborales
-- Ejecutar DESPUÉS de migration_007_campos_ofertas.sql
-- ============================================================

DO $$
DECLARE
  cat_comercio     uuid;
  cat_gastronomia  uuid;
  cat_admin        uuid;
  cat_it           uuid;
  cat_logistica    uuid;
  cat_servicios    uuid;
  cat_salud        uuid;
  v_id             uuid;
BEGIN
  SELECT id INTO cat_comercio    FROM categorias WHERE nombre = 'Comercio y Ventas';
  SELECT id INTO cat_gastronomia FROM categorias WHERE nombre = 'Gastronomía';
  SELECT id INTO cat_admin       FROM categorias WHERE nombre = 'Administración';
  SELECT id INTO cat_it          FROM categorias WHERE nombre = 'Informática y Tecnología';
  SELECT id INTO cat_logistica   FROM categorias WHERE nombre = 'Logística y Transporte';
  SELECT id INTO cat_servicios   FROM categorias WHERE nombre = 'Servicios Generales';
  SELECT id INTO cat_salud       FROM categorias WHERE nombre = 'Salud';

  -- 1. Vendedor/a de Salón
  INSERT INTO ofertas (empresa_nombre, titulo, descripcion, estado, ubicacion, modalidad, jornada, requisitos, beneficios, created_at)
  VALUES (
    'Boutique Funes Centro',
    'Vendedor/a de Salón para Local Comercial',
    'Buscamos incorporar una persona dinámica con experiencia en atención al público y ventas para nuestro local en el centro comercial de Funes. Buen ambiente laboral y posibilidad de crecimiento.',
    'activa',
    'Centro, Funes',
    'Presencial',
    'Tiempo completo',
    ARRAY['Secundario completo', 'Experiencia mínima de 1 año en comercio', 'Residencia en Funes o zonas aledañas (Roldán, Rosario Oeste)', 'Manejo de sistemas de cobro y posnet'],
    ARRAY['Comisiones por ventas', 'Descuentos en productos', 'Capacitación continua'],
    '2026-03-22 10:00:00+00'
  ) RETURNING id INTO v_id;
  INSERT INTO oferta_categorias (oferta_id, categoria_id) VALUES (v_id, cat_comercio);

  -- 2. Ayudante de Cocina
  INSERT INTO ofertas (empresa_nombre, titulo, descripcion, estado, ubicacion, modalidad, jornada, requisitos, beneficios, created_at)
  VALUES (
    'Restobar Paseo de la Estación',
    'Ayudante de Cocina y Minutero/a',
    'Reconocido local gastronómico sobre calle Pedro A. Ríos busca ayudante de cocina con perfil proactivo para turnos rotativos de fin de semana y eventos especiales.',
    'activa',
    'Zona Estación, Funes',
    'Presencial',
    'Part-time',
    ARRAY['Carnet de manipulación de alimentos al día', 'Disponibilidad horaria nocturna y fines de semana', 'Experiencia previa en despacho ágil'],
    ARRAY['Refrigerio incluido', 'Adicional por puntualidad', 'Excelente clima laboral'],
    '2026-03-21 10:00:00+00'
  ) RETURNING id INTO v_id;
  INSERT INTO oferta_categorias (oferta_id, categoria_id) VALUES (v_id, cat_gastronomia);

  -- 3. Analista Administrativo Contable Junior
  INSERT INTO ofertas (empresa_nombre, titulo, descripcion, estado, ubicacion, modalidad, jornada, requisitos, beneficios, created_at)
  VALUES (
    'Grupo Desarrollador Funes Norte',
    'Analista Administrativo Contable Junior',
    'Empresa constructora y desarrolladora inmobiliaria en expansión en Funes incorpora administrativo/a para conciliaciones bancarias, facturación y contacto con proveedores.',
    'activa',
    'Ruta 9 km 315, Funes',
    'Híbrido',
    'Tiempo completo',
    ARRAY['Estudiante avanzado o graduado de Cs. Económicas / Administración', 'Manejo intermedio/avanzado de Excel', 'Buenas relaciones interpersonales y organización'],
    ARRAY['Día libre de cumpleaños', 'Bono por cumplimiento', 'Flexibilidad horaria'],
    '2026-03-20 10:00:00+00'
  ) RETURNING id INTO v_id;
  INSERT INTO oferta_categorias (oferta_id, categoria_id) VALUES (v_id, cat_admin);

  -- 4. Desarrollador/a Frontend
  INSERT INTO ofertas (empresa_nombre, titulo, descripcion, estado, ubicacion, modalidad, jornada, requisitos, beneficios, created_at)
  VALUES (
    'Funes Tech Lab Hub',
    'Desarrollador/a Frontend React / Next.js',
    'Startup tecnológica con base en Funes busca Frontend Developer para construir plataformas web modernas. Trabajo colaborativo con equipos de diseño y producto.',
    'activa',
    'Polo Tecnológico, Funes',
    'Híbrido',
    'Tiempo completo',
    ARRAY['TypeScript, React, Next.js y Tailwind CSS', 'Experiencia con integración de APIs REST / Supabase', 'Proactividad y ganas de aprender'],
    ARRAY['Equipamiento provisto', 'Presupuesto para cursos', 'Horario flexible'],
    '2026-03-19 10:00:00+00'
  ) RETURNING id INTO v_id;
  INSERT INTO oferta_categorias (oferta_id, categoria_id) VALUES (v_id, cat_it);

  -- 5. Operario/a de Depósito
  INSERT INTO ofertas (empresa_nombre, titulo, descripcion, estado, ubicacion, modalidad, jornada, requisitos, beneficios, created_at)
  VALUES (
    'Logística y Envíos del Litoral',
    'Operario/a de Depósito y Picking',
    'Centro de distribución ubicado en el Parque Industrial incorpora personal para control de stock, preparación de pedidos (picking) y carga y descarga de mercadería.',
    'activa',
    'Parque Industrial Funes',
    'Presencial',
    'Tiempo completo',
    ARRAY['Secundario completo', 'Manejo de autoelevador (deseable, no excluyente)', 'Capacidad para trabajo en equipo y atención al detalle'],
    ARRAY['Servicio de traslado corporativo desde garitas de Ruta 9', 'Uniforme de trabajo'],
    '2026-03-18 10:00:00+00'
  ) RETURNING id INTO v_id;
  INSERT INTO oferta_categorias (oferta_id, categoria_id) VALUES (v_id, cat_logistica);

  -- 6. Técnico/a Electricista
  INSERT INTO ofertas (empresa_nombre, titulo, descripcion, estado, ubicacion, modalidad, jornada, requisitos, beneficios, created_at)
  VALUES (
    'Servicios Generales Funes SRL',
    'Técnico/a Electricista de Mantenimiento',
    'Buscamos técnico matriculado o idóneo para mantenimiento eléctrico en barrios cerrados y comercios de la ciudad de Funes. Tareas preventivas y correctivas.',
    'activa',
    'Funes y alrededores',
    'Presencial',
    'Tiempo completo',
    ARRAY['Experiencia comprobable en tableros y cableados trifásicos/monofásicos', 'Licencia de conducir vigente (B1)', 'Herramientas propias básicas'],
    ARRAY['Vehículo utilitario provisto para traslados laborales', 'Premios por productividad'],
    '2026-03-17 10:00:00+00'
  ) RETURNING id INTO v_id;
  INSERT INTO oferta_categorias (oferta_id, categoria_id) VALUES (v_id, cat_servicios);

  -- 7. Enfermero/a Profesional
  INSERT INTO ofertas (empresa_nombre, titulo, descripcion, estado, ubicacion, modalidad, jornada, requisitos, beneficios, created_at)
  VALUES (
    'Salud Integral Funes',
    'Enfermero/a Profesional para Cuidados Domiciliarios',
    'Servicio de atención de salud requiere enfermero/a matriculado/a para guardias pasivas y asistencia a pacientes adultos mayores en domicilio particular.',
    'activa',
    'Barrio Cantegril, Funes',
    'Presencial',
    'Part-time',
    ARRAY['Título habilitante y matrícula provincial vigente', 'Vocación de servicio y empatía', 'Disponibilidad para guardias rotativas'],
    ARRAY['Honorarios acordes a la función', 'Seguro de mala praxis cubierto'],
    '2026-03-16 10:00:00+00'
  ) RETURNING id INTO v_id;
  INSERT INTO oferta_categorias (oferta_id, categoria_id) VALUES (v_id, cat_salud);

  -- 8. Cajero/a y Repositor/a
  INSERT INTO ofertas (empresa_nombre, titulo, descripcion, estado, ubicacion, modalidad, jornada, requisitos, beneficios, created_at)
  VALUES (
    'Cadena Regional de Supermercados',
    'Cajero/a y Repositor/a para Supermercado',
    'Incorporamos personal para atención en línea de cajas y reposición de góndolas en nuestra sucursal de Funes. Buscamos predisposición y cordialidad.',
    'activa',
    'Av. Fuerza Aérea, Funes',
    'Presencial',
    'Tiempo completo',
    ARRAY['Mayor de 18 años con secundario completo', 'Disponibilidad horaria (turnos mañana y tarde)', 'Residencia en Funes'],
    ARRAY['Convenio mercantil', 'Descuento en compras mensuales'],
    '2026-03-15 10:00:00+00'
  ) RETURNING id INTO v_id;
  INSERT INTO oferta_categorias (oferta_id, categoria_id) VALUES (v_id, cat_comercio);

END $$;
