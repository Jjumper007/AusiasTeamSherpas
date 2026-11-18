import type { DecisionStyle, TopicId } from '@sherpas/shared'
import {
  Bell,
  CreditCard,
  GraduationCap,
  House,
  LifeBuoy,
  type LucideIcon,
  PiggyBank,
  Search,
  Send,
  Shield,
  Sunset,
  TrendingUp,
  Wallet,
  Zap,
} from 'lucide-react'

/** Lucide line icons (DESIGN.md: one icon family, never emoji). */

export const TOPIC_ICON: Readonly<Record<TopicId, LucideIcon>> = {
  retirement: Sunset,
  college: GraduationCap,
  emergency_fund: LifeBuoy,
  debt: CreditCard,
  protection: Shield,
  home_purchase: House,
  investments: TrendingUp,
}

export const CTA_ICON: Readonly<Record<DecisionStyle, LucideIcon>> = {
  just_do_it: Zap,
  research_first: Search,
  ask_trusted: Send,
  wait: Bell,
}

const PILLAR_ICONS: ReadonlyArray<readonly [RegExp, LucideIcon]> = [
  [/insurance|protection/i, Shield],
  [/liquidity|emergency/i, LifeBuoy],
  [/debt/i, CreditCard],
  [/invest/i, TrendingUp],
  [/saving|cash flow/i, PiggyBank],
]

/** An icon for one area of the score, by its name. */
export const pillarIcon = (name: string): LucideIcon =>
  PILLAR_ICONS.find(([pattern]) => pattern.test(name))?.[1] ?? Wallet
