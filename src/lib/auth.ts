// Mock NextAuth exports to bypass login and authenticate everyone as SUPER_ADMIN
export const auth = async () => {
  return {
    user: {
      id: "660000000000000000000000",
      name: "Utilisateur",
      email: "user@logiflow.tn",
      role: "SUPER_ADMIN",
    }
  }
}

export const handlers = {
  GET: async () => {
    return new Response(JSON.stringify(await auth()), {
      headers: { "Content-Type": "application/json" }
    })
  },
  POST: async () => {
    return new Response(JSON.stringify(await auth()), {
      headers: { "Content-Type": "application/json" }
    })
  }
}

export const signIn = async () => {}
export const signOut = async () => {}
