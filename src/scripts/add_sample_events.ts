// src/scripts/add_sample_events.ts
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function addSampleEvents() {
  console.log('🌱 Agregando eventos de prueba...');

  try {
    // Verificar que existan categorías
    const categories = await prisma.category.findMany();
    if (categories.length === 0) {
      console.log('❌ No se encontraron categorías. Ejecuta el seed primero.');
      return;
    }

    // Buscar usuario admin para organizador
    const admin = await prisma.user.findFirst({
      where: { rolId: 1 }
    });

    if (!admin) {
      console.log('❌ No se encontró usuario admin. Ejecuta el seed primero.');
      return;
    }

    const eventosEjemplo = [
      {
        title: 'Conferencia de Inteligencia Artificial 2025',
        description: 'Una conferencia magistral sobre las últimas tendencias en inteligencia artificial y machine learning. Expertos de la industria compartirán sus conocimientos y experiencias en el desarrollo de IA.',
        shortDescription: 'Explora el futuro de la IA con expertos líderes',
        startDate: new Date('2025-06-20T09:00:00.000Z'),
        endDate: new Date('2025-06-20T17:00:00.000Z'),
        startTime: '09:00',
        endTime: '17:00',
        location: 'Auditorio Principal UJAT',
        address: 'Km. 1 Carretera Cunduacán-Jalpa, Cunduacán, Tabasco',
        categoryId: 1, // Conferencia
        maxCapacity: 200,
        requiresCertificate: true,
        isFeatured: true,
        requirements: [
          'Estudiante universitario o profesional en área tecnológica',
          'Conocimientos básicos de programación',
          'Laptop personal (opcional)'
        ],
        tags: ['IA', 'Machine Learning', 'Tecnología', 'Futuro'],
        organizerId: admin.id
      },
      {
        title: 'Taller de Desarrollo Web con React',
        description: 'Taller práctico donde aprenderás a crear aplicaciones web modernas utilizando React, hooks, y las mejores prácticas de desarrollo frontend.',
        shortDescription: 'Aprende React desde cero con ejercicios prácticos',
        startDate: new Date('2025-06-25T14:00:00.000Z'),
        endDate: new Date('2025-06-25T18:00:00.000Z'),
        startTime: '14:00',
        endTime: '18:00',
        location: 'Laboratorio de Cómputo DACYTI',
        address: 'División Académica de Ciencias y Tecnologías de la Información',
        categoryId: 2, // Taller
        maxCapacity: 30,
        requiresCertificate: true,
        isFeatured: false,
        requirements: [
          'Conocimientos básicos de HTML, CSS y JavaScript',
          'Laptop con Node.js instalado',
          'Editor de código (VS Code recomendado)'
        ],
        tags: ['React', 'Frontend', 'JavaScript', 'Web Development'],
        organizerId: admin.id
      },
      {
        title: 'Seminario de Ciberseguridad Empresarial',
        description: 'Seminario especializado en las mejores prácticas de ciberseguridad para empresas. Cubriremos temas desde prevención hasta respuesta a incidentes.',
        shortDescription: 'Protege tu empresa con estrategias de ciberseguridad',
        startDate: new Date('2025-07-02T10:00:00.000Z'),
        endDate: new Date('2025-07-02T15:00:00.000Z'),
        startTime: '10:00',
        endTime: '15:00',
        location: 'Sala de Conferencias UJAT',
        categoryId: 3, // Seminario
        maxCapacity: 80,
        requiresCertificate: true,
        isFeatured: true,
        requirements: [
          'Profesionales en TI o áreas afines',
          'Experiencia en administración de sistemas',
          'Interés en seguridad informática'
        ],
        tags: ['Ciberseguridad', 'Empresas', 'Protección', 'IT'],
        organizerId: admin.id
      },
      {
        title: 'Curso de Python para Ciencia de Datos',
        description: 'Curso intensivo de Python enfocado en ciencia de datos. Aprenderás pandas, numpy, matplotlib y técnicas de análisis de datos.',
        shortDescription: 'Domina Python para análisis de datos',
        startDate: new Date('2025-07-10T08:00:00.000Z'),
        endDate: new Date('2025-07-12T17:00:00.000Z'),
        startTime: '08:00',
        endTime: '17:00',
        location: 'Aula Magna UJAT',
        categoryId: 4, // Curso
        maxCapacity: 50,
        requiresCertificate: true,
        isFeatured: false,
        requirements: [
          'Conocimientos básicos de programación',
          'Laptop con Python 3.8+ instalado',
          'Interés en análisis de datos'
        ],
        tags: ['Python', 'Data Science', 'Análisis', 'Programación'],
        organizerId: admin.id
      },
      {
        title: 'Hackathon Innovación Tecnológica 2025',
        description: 'Competencia de 48 horas donde equipos desarrollarán soluciones innovadoras a problemas reales. Premios para los mejores proyectos.',
        shortDescription: '48 horas de innovación y desarrollo tecnológico',
        startDate: new Date('2025-07-18T18:00:00.000Z'),
        endDate: new Date('2025-07-20T18:00:00.000Z'),
        startTime: '18:00',
        endTime: '18:00',
        location: 'Centro de Innovación UJAT',
        categoryId: 5, // Hackathon
        maxCapacity: 120,
        requiresCertificate: true,
        isFeatured: true,
        requirements: [
          'Estudiantes o profesionales en tecnología',
          'Formar equipos de 3-5 personas',
          'Laptop y conocimientos de programación'
        ],
        tags: ['Hackathon', 'Innovación', 'Competencia', 'Desarrollo'],
        organizerId: admin.id
      },
      {
        title: 'Workshop de UX/UI Design',
        description: 'Aprende los fundamentos del diseño de experiencias de usuario y diseño de interfaces. Incluye ejercicios prácticos con herramientas profesionales.',
        shortDescription: 'Diseña experiencias digitales excepcionales',
        startDate: new Date('2025-06-28T09:00:00.000Z'),
        endDate: new Date('2025-06-28T16:00:00.000Z'),
        startTime: '09:00',
        endTime: '16:00',
        location: 'Laboratorio de Diseño',
        categoryId: 2, // Taller
        maxCapacity: 25,
        requiresCertificate: false,
        isFeatured: false,
        requirements: [
          'Interés en diseño digital',
          'Laptop personal',
          'No se requiere experiencia previa'
        ],
        tags: ['UX', 'UI', 'Diseño', 'Digital'],
        organizerId: admin.id
      }
    ];

    // Crear eventos
    for (const eventoData of eventosEjemplo) {
      const evento = await prisma.event.create({
        data: eventoData,
        include: {
          category: true,
          organizer: {
            select: { id: true, name: true, email: true }
          }
        }
      });

      console.log(`✅ Evento creado: ${evento.title}`);

      // Crear algunas actividades del programa para algunos eventos
      if (evento.id <= 3) {
        const scheduleItems = [
          {
            startTime: '09:00',
            endTime: '09:30',
            title: 'Registro y bienvenida',
            description: 'Registro de participantes y desayuno de bienvenida',
            order: 1
          },
          {
            startTime: '09:30',
            endTime: '11:00',
            title: 'Conferencia magistral',
            description: 'Presentación principal del evento',
            speaker: 'Dr. Juan Pérez',
            order: 2
          },
          {
            startTime: '11:00',
            endTime: '11:15',
            title: 'Receso',
            order: 3
          },
          {
            startTime: '11:15',
            endTime: '12:30',
            title: 'Mesa redonda',
            description: 'Discusión entre expertos del tema',
            order: 4
          }
        ];

        for (const scheduleItem of scheduleItems) {
          await prisma.eventSchedule.create({
            data: {
              ...scheduleItem,
              eventId: evento.id
            }
          });
        }

        console.log(`  📅 Programa agregado para: ${evento.title}`);
      }
    }

    console.log('\n🎉 Eventos de prueba agregados exitosamente!');
    console.log('\n📋 Eventos disponibles:');
    
    const allEvents = await prisma.event.findMany({
      include: {
        category: true,
        _count: {
          select: { registrations: true }
        }
      },
      orderBy: { startDate: 'asc' }
    });

    allEvents.forEach(event => {
      console.log(`  • ${event.title} (${event.category.name}) - ${event.startDate.toLocaleDateString()}`);
    });

  } catch (error) {
    console.error('❌ Error al agregar eventos:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Ejecutar la función directamente
addSampleEvents();