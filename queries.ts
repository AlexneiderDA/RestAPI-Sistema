// 1
import { PrismaClient } from './generated/prisma'
import { withAccelerate } from '@prisma/extension-accelerate'

// 2
const prisma = new PrismaClient()
  .$extends(withAccelerate())

// 3
async function main() {

  await prisma.rol.create({
    data: {
      name: 'admin',
    }
  })

  await prisma.user.create({
    data:{
      email: 'admin@gmail.com',
      name: 'Alejandro',
      password: '123456',
      rolId: 1,
    }
  })

   const allUsers = await prisma.user.findMany({
    include: {
      rol: true,
    },
    
  })
  console.dir(allUsers, { depth: null })
}

// 4
main()
  .then(async () => {
    await prisma.$disconnect()
  })
  .catch(async (e) => {
    console.error(e)
    // 5
    await prisma.$disconnect()
    process.exit(1)
  })