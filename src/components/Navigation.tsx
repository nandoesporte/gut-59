import * as React from "react"
import Link from "next/link"
import { usePathname } from 'next/navigation';

import { Icons } from "@/components/icons"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet"
import { Button } from "@/components/ui/button"
import {
  UtensilsCrossed,
  LineChart,
  ShoppingBag,
  GraduationCap,
  Dumbbell,
  Apple
} from "lucide-react";

export const Navigation = () => {
  const pathname = usePathname();

  const routes = [
    {
      href: '/',
      label: 'Progresso',
      icon: LineChart
    },
    {
      href: '/menu',
      label: 'Cardápio',
      icon: UtensilsCrossed
    },
    {
      href: '/nutri',
      label: 'Nutricional',
      icon: Apple
    },
    {
      href: '/workout',
      label: 'Treino',
      icon: Dumbbell
    },
    {
      href: '/store',
      label: 'Loja',
      icon: ShoppingBag
    },
    {
      href: '/trainer',
      label: 'Educacional',
      icon: GraduationCap
    }
  ];

  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon">
          <Icons.menu className="h-6 w-6" />
          <span className="sr-only">Abrir menu</span>
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="pr-0">
        <SheetHeader className="text-left">
          <SheetTitle>Menu</SheetTitle>
          <SheetDescription>
            Navegue pelas opções do aplicativo.
          </SheetDescription>
        </SheetHeader>
        <div className="mt-4">
          {routes.map((route) => (
            <Link
              key={route.href}
              href={route.href}
              className={`flex items-center space-x-2 py-2 px-4 rounded-md hover:bg-secondary ${pathname === route.href ? 'bg-secondary text-secondary-foreground font-medium' : 'text-muted-foreground'}`}
            >
              <route.icon className="h-4 w-4" />
              <span>{route.label}</span>
            </Link>
          ))}
        </div>
      </SheetContent>
    </Sheet>
  )
}
