import { ImageResponse } from 'next/og'

export const runtime = 'edge'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

export default async function Image({
  params,
  searchParams,
}: {
  params: Promise<{ address: string }>
  searchParams: Promise<{ name?: string; bio?: string }>
}) {
  const { address } = await params
  const { name = 'Creator', bio = 'Building on Arc Testnet' } =
    await searchParams
  const shortAddress = address.slice(0, 6) + '...' + address.slice(-4)

  return new ImageResponse(
    (
      <div
        style={{
          width: '1200px',
          height: '630px',
          background: 'linear-gradient(135deg, #0D1B2F 0%, #19354D 100%)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          fontFamily: 'sans-serif',
          padding: '60px',
        }}
      >
        {/* Avatar circle with initials */}
        <div
          style={{
            width: '120px',
            height: '120px',
            borderRadius: '60px',
            background: 'rgba(62,116,187,0.3)',
            border: '3px solid #3E74BB',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '48px',
            color: '#ACC6E9',
            fontWeight: 'bold',
            marginBottom: '32px',
          }}
        >
          {name.charAt(0).toUpperCase()}
        </div>

        {/* Creator name */}
        <div
          style={{
            fontSize: '64px',
            fontWeight: 'bold',
            color: '#FFFFFF',
            marginBottom: '16px',
          }}
        >
          {name}
        </div>

        {/* Bio */}
        <div
          style={{
            fontSize: '28px',
            color: '#ACC6E9',
            marginBottom: '40px',
            textAlign: 'center',
            maxWidth: '800px',
          }}
        >
          {bio}
        </div>

        {/* CTA banner */}
        <div
          style={{
            background: '#3E74BB',
            borderRadius: '16px',
            padding: '20px 48px',
            fontSize: '32px',
            color: 'white',
            fontWeight: 600,
            marginBottom: '32px',
          }}
        >
          💰 Send USDC tip on Arc Testnet
        </div>

        {/* Wallet address */}
        <div
          style={{
            fontSize: '20px',
            color: 'rgba(172,198,233,0.6)',
            marginBottom: '16px',
          }}
        >
          {shortAddress}
        </div>

        {/* ArcJar branding */}
        <div
          style={{
            position: 'absolute',
            bottom: '40px',
            right: '60px',
            fontSize: '24px',
            color: 'rgba(255,255,255,0.4)',
          }}
        >
          ArcJar · arc-tipjar-six.vercel.app
        </div>
      </div>
    ),
    { ...size },
  )
}
