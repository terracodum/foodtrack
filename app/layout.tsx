import type { Metadata } from "next";
import "./globals.css";
import InstallRegistration from "../components/pwa-registration";
export const metadata: Metadata = {title:"FoodTrack — питание и тренировки", description:"Личная фитнес-база: питание, тренировки и состав тела",applicationName:"FoodTrack",appleWebApp:{capable:true,title:"FoodTrack",statusBarStyle:"default"},icons:{icon:"/icons/icon-192.png",apple:"/icons/apple-touch-icon.png"}};
export default function RootLayout({children}:{children:React.ReactNode}) {return <html lang="ru"><head><link rel="manifest" href="/manifest.webmanifest" crossOrigin="use-credentials"/><meta name="theme-color" content="#3d8265"/><meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover"/></head><body><InstallRegistration/>{children}</body></html>}
