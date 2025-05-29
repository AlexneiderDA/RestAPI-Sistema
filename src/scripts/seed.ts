// src/scripts/seed.ts (script para datos iniciales)
import { PrismaClient } from '@prisma/client';
import { hashPassword } from '../utils/password.util.js';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Iniciando seed de datos...');

  // Crear roles
  const adminRole = await prisma.rol.upsert({
    where: { id: 1 },
    update: {},
    create: { id: 1, name: 'Administrador' }
  });

  const userRole = await prisma.rol.upsert({
    where: { id: 2 },
    update: {},
    create: { id: 2, name: 'Usuario' }
  });

  const organizerRole = await prisma.rol.upsert({
    where: { id: 3 },
    update: {},
    create: { id: 3, name: 'Organizador' }
  });

  // Crear usuario administrador
  const adminPassword = await hashPassword('admin123');
  const admin = await prisma.user.upsert({
    where: { email: 'admin@dacyti.edu.mx' },
    update: {},
    create: {
      name: 'Administrador Sistema',
      email: 'admin@dacyti.edu.mx',
      password: adminPassword,
      rolId: 1
    }
  });

  // Crear categorías
  const categories = [
    { name: 'Conferencia', description: 'Eventos de conferencias magistrales', color: '#1C8443' },
    { name: 'Taller', description: 'Talleres prácticos y hands-on', color: '#41AD49' },
    { name: 'Seminario', description: 'Seminarios académicos', color: '#8DC642' },
    { name: 'Curso', description: 'Cursos de capacitación', color: '#38A2C1' },
    { name: 'Hackathon', description: 'Competencias de desarrollo', color: '#67DCD7' }
  ];

  for (const category of categories) {
    await prisma.category.upsert({
      where: { name: category.name },
      update: {},
      create: category
    });
  }

  // Crear evento de ejemplo
  const sampleEvent = await prisma.event.upsert({
    where: { id: 1 },
    update: {},
    create: {
      title: 'Conferencia de Inteligencia Artificial 2025',
      description: 'Una conferencia sobre las últimas tendencias en IA y Machine Learning.',
      shortDescription: 'Explora el futuro de la IA con expertos líderes.',
      startDate: new Date('2025-06-15T10:00:00.000Z'),
      endDate: new Date('2025-06-15T18:00:00.000Z'),
      startTime: '10:00',
      endTime: '18:00',
      location: 'Auditorio Principal',
      address: 'Ciudad Universitaria, México',
      categoryId: 1,
      maxCapacity: 200,
      requiresCertificate: true,
      isFeatured: true,
      organizerId: admin.id,
      tags: ['IA', 'Machine Learning', 'Tecnología']
    }
  });

  console.log('✅ Seed completado exitosamente');
  console.log(`📧 Admin: admin@dacyti.edu.mx / admin123`);
}

main()
  .catch((e) => {
    console.error('❌ Error en seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });