import './globals.css'
import BackButton from './components/BackButton'

export const metadata = {
  title: 'SportSlot — Sports club booking',
  description: 'Booking software for sports clubs.',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>
        <BackButton />
        {children}
      </body>
    </html>
  )
}
