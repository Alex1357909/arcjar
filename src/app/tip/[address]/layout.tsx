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
  const ogImage = `https://arc-tipjar-six.vercel.app/api/og?name=${encodeURIComponent(name)}&bio=${encodeURIComponent(bio)}&address=${encodeURIComponent(address)}`

  return {
    title: `Tip ${name} on Arc | ArcJar`,
    description: `Send ${name} USDC tips instantly on Arc Testnet. ${bio}`,
    openGraph: {
      title: `Send ${name} a USDC tip on Arc`,
      description: bio,
      url,
      siteName: 'ArcJar',
      type: 'website',
      images: [
        {
          url: ogImage,
          width: 1200,
          height: 630,
          alt: `Tip ${name} on ArcJar`,
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title: `Send ${name} a USDC tip on Arc`,
      description: bio,
      images: [ogImage],
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
