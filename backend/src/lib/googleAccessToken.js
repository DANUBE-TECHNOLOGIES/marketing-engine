async function getGoogleAccessToken(prisma) {
  const token = await prisma.googleToken.findFirst({
    where: { provider: "google" },
    orderBy: { createdAt: "desc" }
  });

  if (!token?.refreshToken) {
    throw new Error("Aucun refresh token Google disponible");
  }

  if (
    token.accessToken &&
    token.expiryDate &&
    Number(token.expiryDate) > Date.now() + 60_000
  ) {
    return token.accessToken;
  }

  const body = new URLSearchParams({
    client_id: process.env.GOOGLE_CLIENT_ID,
    client_secret: process.env.GOOGLE_CLIENT_SECRET,
    refresh_token: token.refreshToken,
    grant_type: "refresh_token"
  });

  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body
  });
  const data = await response.json();

  if (!response.ok) {
    throw new Error(`Erreur refresh token Google : ${JSON.stringify(data)}`);
  }

  await prisma.googleToken.update({
    where: { id: token.id },
    data: {
      accessToken: data.access_token,
      expiryDate: BigInt(Date.now() + Number(data.expires_in || 3600) * 1000)
    }
  });

  return data.access_token;
}

module.exports = getGoogleAccessToken;
