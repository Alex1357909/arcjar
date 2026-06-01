import type { Metadata } from 'next'

export async function generateMetadata({
  params,
  searchParams,
}: {
  params: Promise<{ address: string }>
  searchParams: Promise<{ name?: string; bio?: string }>
}): Promise<Metadata> {
  const { address } = await params
  const { name = 'Creator', bio = 'Building on Arc Testnet' } =
    await searchParams
  const url = `https://arc-tipjar-six.vercel.app/tip/${address}`

  return {
    title: `Tip ${name} on Arc | ArcJar`,
    description: `Send ${name} USDC tips instantly on Arc Testnet. ${bio}`,
    openGraph: {
      title: `Send ${name} a USDC tip on Arc`,
      description: bio,
      url,
      siteName: 'ArcJar',
      type: 'website',
    },
    twitter: {
      card: 'summary_large_image',
      title: `Send ${name} a USDC tip on Arc`,
      description: bio,
    },
  }
}

export default function TipAddressLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return children
}
