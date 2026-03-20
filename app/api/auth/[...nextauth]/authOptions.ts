import { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { prisma } from "../../../lib/prisma";
import bcrypt from "bcrypt";

async function getUserDepartment(userId: number) {
  if (!Number.isFinite(userId) || userId <= 0) {
    return {
      departmentId: null as number | null,
      departmentName: null as string | null,
    };
  }

  const faculty = await prisma.faculty.findFirst({
    where: { user_id: userId },
    select: { department_id: true },
  });

  if (!faculty?.department_id) {
    return {
      departmentId: null as number | null,
      departmentName: null as string | null,
    };
  }

  const department = await prisma.department.findUnique({
    where: { id: faculty.department_id },
    select: { name: true },
  });

  return {
    departmentId: faculty.department_id,
    departmentName: department?.name ?? null,
  };
}

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        username: { label: "Username", type: "text" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.username || !credentials?.password) {
          throw new Error("Username and password are required");
        }

        const user = await prisma.users.findFirst({
          where: {
            username: credentials.username,
          },
          select: { id: true, username: true, role: true, password: true },
        });

        if (!user) throw new Error("Invalid credentials");

        const isPasswordMatch = await bcrypt.compare(
          credentials.password,
          user.password,
        );
        if (!isPasswordMatch) throw new Error("Invalid credentials");

        return {
          id: user.id.toString(),
          name: user.username,
          username: user.username,
          role: user.role,
          status: 1,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.username = (user as any).username;
        token.role = (user as any).role;

        const userId = Number((user as any).id) || 0;
        const dept = await getUserDepartment(userId);
        token.departmentId = dept.departmentId;
        token.departmentName = dept.departmentName;
      } else if (token.id && token.departmentId === undefined) {
        const userId = Number(token.id) || 0;
        const dept = await getUserDepartment(userId);
        token.departmentId = dept.departmentId;
        token.departmentName = dept.departmentName;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        (session.user as any).id = token.id as string;
        (session.user as any).username = token.username as string;
        (session.user as any).role = token.role as number;
        (session.user as any).departmentId =
          (token as any).departmentId ?? null;
        (session.user as any).departmentName =
          (token as any).departmentName ?? null;
      }
      return session;
    },
  },
  pages: {
    signIn: "/",
  },
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60,
  },
  secret: process.env.NEXTAUTH_SECRET,
};
