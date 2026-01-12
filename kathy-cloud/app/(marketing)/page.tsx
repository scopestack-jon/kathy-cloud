import type React from "react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import {
  ArrowRight,
  Chrome,
  Zap,
  Check,
  AlertCircle,
  RefreshCw,
  FileText,
  DollarSign,
  TrendingDown,
  Clock,
  Shield,
  Users,
  BarChart3,
} from "lucide-react"

export default function Home() {
  return (
    <main className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-background/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-2xl font-bold text-primary">Kathy.dev</span>
          </div>
          <nav className="hidden md:flex items-center gap-8">
            <a href="#features" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
              Features
            </a>
            <a href="#how-it-works" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
              How it Works
            </a>
            <a href="#comparison" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
              Comparison
            </a>
          </nav>
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" className="hidden md:inline-flex" asChild>
              <a href="mailto:sales@kathy.dev">Contact Sales</a>
            </Button>
            <Button size="sm" className="bg-primary hover:bg-primary/90 text-primary-foreground" asChild>
              <a href="/signup">Get Started</a>
            </Button>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="container mx-auto px-4 pt-20 pb-24 md:pt-32 md:pb-40">
        <div className="max-w-5xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary text-sm font-medium mb-8">
            <Chrome className="w-4 h-4" />
            <span>Universal Payment Layer • Works with Any Web App</span>
          </div>

          <h1 className="text-5xl md:text-7xl font-bold text-foreground mb-6 text-balance leading-tight">
            The Universal Payment Layer for Any Application
          </h1>

          <p className="text-xl md:text-2xl text-muted-foreground mb-10 max-w-3xl mx-auto text-pretty leading-relaxed">
            Kathy.dev sits on top of any software, turning it into a payment-enabled platform—without rebuilding
            anything. One universal layer. Any web app. Instant payment collection.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Button size="lg" className="bg-primary hover:bg-primary/90 text-primary-foreground text-lg px-8 py-6" asChild>
              <a href="/signup">
                Get Started
                <ArrowRight className="ml-2 w-5 h-5" />
              </a>
            </Button>
            <Button size="lg" variant="outline" className="text-lg px-8 py-6 bg-transparent" asChild>
              <a href="#how-it-works">See How It Works</a>
            </Button>
          </div>
        </div>
      </section>

      {/* What is a Universal Payment Layer */}
      <section className="bg-muted/30 py-20 md:py-28">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto">
            <h2 className="text-3xl md:text-5xl font-bold text-foreground mb-6 text-balance text-center">
              What is a Universal Payment Layer?
            </h2>
            <div className="space-y-6 text-lg text-muted-foreground leading-relaxed">
              <p>
                Most businesses are trapped by their software's payment limitations. Your vertical-specific application
                either lacks open payment APIs or forces you into expensive, integrated processors. The result? You're
                stuck doing dual entry—processing payments outside your software and manually recording them inside.
              </p>
              <p className="text-foreground font-semibold">Kathy.dev changes everything.</p>
              <p>
                We're not another payment processor. We're not an integration. We're a{" "}
                <span className="text-primary font-semibold">Universal Payment Layer</span> that sits on top of any
                web-based application, allowing you to collect and record payments instantly, regardless of what
                software you use.
              </p>
              <p className="text-lg italic">
                Think of it as a payment operating system for your business—one that works with every application, every
                processor, and every workflow.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Problem Section */}
      <section className="container mx-auto px-4 py-20 md:py-28">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-5xl font-bold text-foreground mb-4 text-balance">
              The Problem: Software That Holds Your Payments Hostage
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto text-pretty">
              Are you still manually entering credit card payments into your business software? Juggling between a POS
              terminal and your accounting software just to close out the day?
            </p>
          </div>

          <Card className="p-8 md:p-12 bg-destructive/5 border-destructive/20 mb-8">
            <h3 className="text-2xl font-bold text-foreground mb-6">
              For years, business owners using specialized software have been stuck in a frustrating loop:
            </h3>

            <div className="space-y-4 mb-8">
              <WorkflowStep
                number="1"
                text="Process a payment outside your software (on a card terminal or separate portal)"
              />
              <WorkflowStep number="2" text="Manually record that payment back in your software" />
              <WorkflowStep number="3" text="Hope you didn't make a mistake" />
            </div>

            <div className="p-6 bg-background rounded-lg border border-destructive/20">
              <p className="text-lg font-semibold text-destructive mb-4">
                This isn't just inefficient—it's a recipe for disaster.
              </p>
              <ul className="space-y-2 text-muted-foreground">
                <li className="flex items-start gap-2">
                  <Clock className="w-5 h-5 text-destructive flex-shrink-0 mt-0.5" />
                  <span>Manual data entry wastes countless hours</span>
                </li>
                <li className="flex items-start gap-2">
                  <AlertCircle className="w-5 h-5 text-destructive flex-shrink-0 mt-0.5" />
                  <span>Introduces costly human errors</span>
                </li>
                <li className="flex items-start gap-2">
                  <BarChart3 className="w-5 h-5 text-destructive flex-shrink-0 mt-0.5" />
                  <span>Leads to delayed financial reporting that hinders cash flow visibility</span>
                </li>
              </ul>
            </div>
          </Card>

          <Card className="p-8 md:p-12 bg-destructive/5 border-destructive/20">
            <h3 className="text-2xl font-bold text-foreground mb-6 flex items-center gap-2">
              <TrendingDown className="w-6 h-6 text-destructive" />
              The Real Problem? Your software vendor controls your payment options.
            </h3>

            <p className="text-lg text-foreground mb-6 leading-relaxed">
              They decide which processors you can use, what fees you pay, and whether you can even accept payments at
              all.
            </p>

            <div className="grid md:grid-cols-2 gap-4">
              <div className="p-4 bg-background rounded-lg border border-destructive/20">
                <p className="text-foreground font-medium mb-2">67% more time for follow-up</p>
                <p className="text-sm text-muted-foreground">Manual payment processes are significantly slower</p>
              </div>
              <div className="p-4 bg-background rounded-lg border border-destructive/20">
                <p className="text-foreground font-medium mb-2">30% longer DSO</p>
                <p className="text-sm text-muted-foreground">Days Sales Outstanding increases dramatically</p>
              </div>
            </div>
          </Card>
        </div>
      </section>

      {/* Flawed Solution Section */}
      <section className="bg-muted/30 py-20 md:py-28">
        <div className="container mx-auto px-4">
          <div className="max-w-5xl mx-auto">
            <div className="text-center mb-12">
              <h2 className="text-3xl md:text-5xl font-bold text-foreground mb-4 text-balance">
                The Flawed Solution: Why Traditional Integration Fails
              </h2>
              <p className="text-lg text-muted-foreground max-w-2xl mx-auto text-pretty">
                You've been told the solution is "integrated payments." But this usually means one of two things:
              </p>
            </div>

            <div className="grid md:grid-cols-2 gap-6">
              <Card className="p-8 bg-card border-border">
                <div className="w-12 h-12 rounded-full bg-destructive/10 text-destructive flex items-center justify-center font-bold text-xl mb-4">
                  1
                </div>
                <h3 className="text-xl font-bold text-foreground mb-3">Use the vendor's built-in processor</h3>
                <p className="text-muted-foreground leading-relaxed">
                  Pay premium rates with no negotiating power. You're locked into their preferred payment ecosystem.
                </p>
              </Card>

              <Card className="p-8 bg-card border-border">
                <div className="w-12 h-12 rounded-full bg-destructive/10 text-destructive flex items-center justify-center font-bold text-xl mb-4">
                  2
                </div>
                <h3 className="text-xl font-bold text-foreground mb-3">Wait for a custom integration</h3>
                <p className="text-muted-foreground leading-relaxed">
                  Requires the software vendor to expose their payment interface and cooperate—often a dead end that
                  takes weeks or months.
                </p>
              </Card>
            </div>

            <div className="mt-8 p-6 bg-destructive/5 border border-destructive/20 rounded-lg">
              <p className="text-lg text-foreground leading-relaxed">
                This approach leaves you at the mercy of the software provider, limiting your ability to choose the
                best, most cost-effective solution for your business.{" "}
                <span className="font-semibold">It's a bottleneck that stifles your growth.</span>
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Solution Section - Kathy Approach */}
      <section className="container mx-auto px-4 py-20 md:py-28">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-16">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary text-sm font-medium mb-6">
              <Zap className="w-4 h-4" />
              <span>The Kathy.dev Solution</span>
            </div>
            <h2 className="text-3xl md:text-5xl font-bold text-foreground mb-6 text-balance">
              The Kathy Approach: A Universal Payment Layer
            </h2>
            <p className="text-lg text-muted-foreground max-w-3xl mx-auto text-pretty leading-relaxed">
              Instead of forcing an in-app integration or rebuilding your software, we created a{" "}
              <span className="text-primary font-semibold">Universal Payment Layer</span> that works with any
              application.
            </p>
          </div>

          <Card className="p-8 md:p-12 bg-primary/5 border-primary/20 mb-12">
            <p className="text-xl text-foreground leading-relaxed mb-6">
              Think of it this way: instead of teaching every software application how to accept payments, we built a
              layer that sits on top of all of them. Our browser-based assistant simulates what a front-desk person
              (like "Kathy") would do—accept a payment externally and update the record in the software—but does it
              instantly, automatically, and error-free.
            </p>
            <p className="text-2xl font-bold text-primary text-center">We automate the human, not the software.</p>
          </Card>

          <div className="grid md:grid-cols-3 gap-6">
            <FeatureCard
              icon={<Zap className="w-8 h-8" />}
              title="Zero Friction"
              description="No more logging into separate payment portals. No copying invoice numbers. No tedious manual reconciliation."
            />
            <FeatureCard
              icon={<Chrome className="w-8 h-8" />}
              title="Contextual Intelligence"
              description="Kathy knows what invoice you're looking at and adapts to each app's unique UI patterns."
            />
            <FeatureCard
              icon={<RefreshCw className="w-8 h-8" />}
              title="Real-Time Sync"
              description="The moment a payment is confirmed, the UI in your application updates instantly. No refresh needed."
            />
          </div>
        </div>
      </section>

      {/* Comparison Table */}
      <section id="comparison" className="bg-muted/30 py-20 md:py-28">
        <div className="container mx-auto px-4">
          <div className="max-w-5xl mx-auto">
            <h2 className="text-3xl md:text-5xl font-bold text-foreground mb-12 text-center text-balance">
              The Universal Payment Layer Advantage
            </h2>

            <div className="overflow-x-auto">
              <table className="w-full bg-card rounded-lg overflow-hidden border border-border">
                <thead>
                  <tr className="bg-muted">
                    <th className="px-6 py-4 text-left text-sm font-semibold text-foreground">Feature</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-muted-foreground">
                      Traditional Integration
                    </th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-primary">
                      Kathy's Universal Payment Layer
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  <ComparisonRow
                    feature="Setup Time"
                    traditional="Weeks to months"
                    kathy="Minutes"
                    kathyBetter={true}
                  />
                  <ComparisonRow
                    feature="Vendor Cooperation Required"
                    traditional="Yes"
                    kathy="No"
                    kathyBetter={true}
                  />
                  <ComparisonRow
                    feature="Works with Any Software"
                    traditional="No (custom per app)"
                    kathy="Yes (universal)"
                    kathyBetter={true}
                  />
                  <ComparisonRow
                    feature="Processor Choice"
                    traditional="Limited by vendor"
                    kathy="Your choice"
                    kathyBetter={true}
                  />
                  <ComparisonRow
                    feature="Dual Entry"
                    traditional="Still required if integration fails"
                    kathy="Eliminated completely"
                    kathyBetter={true}
                  />
                  <ComparisonRow
                    feature="Cost"
                    traditional="High (integration fees + premium rates)"
                    kathy="Low (payment layer + your processor)"
                    kathyBetter={true}
                  />
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section id="how-it-works" className="container mx-auto px-4 py-20 md:py-28">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-5xl font-bold text-foreground mb-4 text-balance">How to Use Kathy</h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto text-pretty">
              Three simple steps. The Universal Payment Layer does the rest.
            </p>
          </div>

          <div className="space-y-8">
            <HowItWorksStep
              number="1"
              title="Configure Your Payment Layer"
              description="Connect Kathy.dev to your existing workflow and browser in about 2 minutes."
              icon={<Chrome className="w-6 h-6" />}
            />
            <HowItWorksStep
              number="2"
              title="Navigate to an Invoice"
              description="Open your business software and go to any invoice or customer record with an outstanding balance."
              icon={<FileText className="w-6 h-6" />}
            />
            <HowItWorksStep
              number="3"
              title="Click to Pay"
              description="Click the Kathy button that appears on the page. The payment is processed through your chosen processor, and the record is updated instantly in your software. No dual entry. No hassle."
              icon={<DollarSign className="w-6 h-6" />}
            />
          </div>

          <div className="mt-12 p-8 bg-primary/10 border border-primary/20 rounded-lg text-center">
            <p className="text-2xl font-bold text-primary">That's it. The Universal Payment Layer does the rest.</p>
          </div>
        </div>
      </section>

      {/* Benefits - Built for Business Owners */}
      <section id="features" className="bg-muted/30 py-20 md:py-28">
        <div className="container mx-auto px-4">
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-16">
              <h2 className="text-3xl md:text-5xl font-bold text-foreground mb-6 text-balance">
                Built for Business Owners Who Value Their Time
              </h2>
              <p className="text-lg text-muted-foreground max-w-3xl mx-auto text-pretty leading-relaxed">
                As a business owner or operator responsible for collecting payments, your time is your most valuable
                asset. We understand that you didn't start your business to become a data entry specialist.
              </p>
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              <BenefitCard
                icon={<Clock className="w-6 h-6" />}
                title="Eliminate Hours of Manual Data Entry"
                description="Save hours each week that you can spend growing your business or serving customers"
              />
              <BenefitCard
                icon={<Shield className="w-6 h-6" />}
                title="Reduce Payment Errors"
                description="Eliminate costly mistakes that waste time and money to fix"
              />
              <BenefitCard
                icon={<BarChart3 className="w-6 h-6" />}
                title="Instant Cash Flow Visibility"
                description="Get real-time insights without waiting for end-of-day reconciliation"
              />
              <BenefitCard
                icon={<DollarSign className="w-6 h-6" />}
                title="Choose Your Payment Processor"
                description="Use the payment processor of your choice without being locked into expensive vendor relationships"
              />
              <BenefitCard
                icon={<Chrome className="w-6 h-6" />}
                title="Keep Using Your Software"
                description="No need to force your team to learn a new system or change workflows"
              />
              <BenefitCard
                icon={<Users className="w-6 h-6" />}
                title="Works with Your Stack"
                description="Integrates with your existing payment processor and current software seamlessly"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Why It Changes Everything */}
      <section className="container mx-auto px-4 py-20 md:py-28">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl md:text-5xl font-bold text-foreground mb-6 text-balance">
            Why a Universal Payment Layer Changes Everything
          </h2>
          <div className="space-y-6 text-lg text-muted-foreground leading-relaxed">
            <p>
              Traditional payment solutions require you to adapt to them. You change your software, your workflow, or
              your processor to fit their system.
            </p>
            <p className="text-2xl font-bold text-primary">The Universal Payment Layer adapts to you.</p>
            <p>
              It works with your existing software, your existing processor, and your existing workflow. It's the
              missing layer that makes any application payment-ready, without requiring anyone's permission or
              cooperation.
            </p>
            <p className="text-xl font-semibold text-foreground italic">
              This is the future of business payments: universal, flexible, and under your control.
            </p>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="container mx-auto px-4 py-20 md:py-32">
        <div className="max-w-4xl mx-auto text-center">
          <Card className="p-12 md:p-16 bg-primary text-primary-foreground">
            <h2 className="text-3xl md:text-5xl font-bold mb-6 text-balance">
              Ready to Experience the Universal Payment Layer?
            </h2>
            <p className="text-lg md:text-xl mb-8 opacity-90 max-w-2xl mx-auto text-pretty leading-relaxed">
              Stop letting your software dictate your payment options. Stop wasting time on dual entry. Stop paying
              premium rates for locked-in processors. Take back control with Kathy.dev.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Button size="lg" variant="secondary" className="text-lg px-8 py-6" asChild>
                <a href="/signup">
                  Get Started
                  <ArrowRight className="ml-2 w-5 h-5" />
                </a>
              </Button>
              <Button
                size="lg"
                variant="outline"
                className="text-lg px-8 py-6 border-primary-foreground/20 text-primary-foreground hover:bg-primary-foreground/10 bg-transparent"
                asChild
              >
                <a href="mailto:sales@kathy.dev">Contact Sales</a>
              </Button>
            </div>
          </Card>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border bg-muted/20">
        <div className="container mx-auto px-4 py-12">
          <div className="grid md:grid-cols-4 gap-8 mb-8">
            <div>
              <div className="flex items-center gap-2 mb-4">
                <span className="text-2xl font-bold text-primary">Kathy.dev</span>
              </div>
              <p className="text-sm text-muted-foreground">Universal payment layer for any application</p>
            </div>

            <div>
              <h3 className="font-semibold text-foreground mb-3">Product</h3>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li>
                  <a href="#features" className="hover:text-foreground transition-colors">
                    Features
                  </a>
                </li>
                <li>
                  <a href="#how-it-works" className="hover:text-foreground transition-colors">
                    How it Works
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:text-foreground transition-colors">
                    Security
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:text-foreground transition-colors">
                    Pricing
                  </a>
                </li>
              </ul>
            </div>

            <div>
              <h3 className="font-semibold text-foreground mb-3">Company</h3>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li>
                  <a href="#" className="hover:text-foreground transition-colors">
                    About
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:text-foreground transition-colors">
                    Blog
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:text-foreground transition-colors">
                    Careers
                  </a>
                </li>
                <li>
                  <a href="mailto:sales@kathy.dev" className="hover:text-foreground transition-colors">
                    Contact
                  </a>
                </li>
              </ul>
            </div>

            <div>
              <h3 className="font-semibold text-foreground mb-3">Legal</h3>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li>
                  <a href="#" className="hover:text-foreground transition-colors">
                    Privacy
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:text-foreground transition-colors">
                    Terms
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:text-foreground transition-colors">
                    Compliance
                  </a>
                </li>
              </ul>
            </div>
          </div>

          <div className="border-t border-border pt-8 flex flex-col md:flex-row items-center justify-between gap-4">
            <p className="text-sm text-muted-foreground">© 2026 Kathy.dev. All rights reserved.</p>
            <div className="flex items-center gap-6">
              <a href="#" className="text-muted-foreground hover:text-foreground transition-colors">
                <span className="sr-only">Twitter</span>
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M8.29 20.251c7.547 0 11.675-6.253 11.675-11.675 0-.178 0-.355-.012-.53A8.348 8.348 0 0022 5.92a8.19 8.19 0 01-2.357.646 4.118 4.118 0 001.804-2.27 8.224 8.224 0 01-2.605.996 4.072 4.072 0 00-6.993 3.743 11.65 11.65 0 01-8.457-4.287 4.072 4.072 0 002.8 9.713v.052a4.105 4.105 0 003.292 4.022 4.095 4.095 0 01-1.853.07 4.108 4.108 0 003.834 2.85A8.233 8.233 0 012 18.407a11.616 11.616 0 006.29 1.84" />
                </svg>
              </a>
              <a href="#" className="text-muted-foreground hover:text-foreground transition-colors">
                <span className="sr-only">LinkedIn</span>
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.238 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z" />
                </svg>
              </a>
            </div>
          </div>
        </div>
      </footer>
    </main>
  )
}

function WorkflowStep({ number, text }: { number: string; text: string }) {
  return (
    <div className="flex items-start gap-3">
      <div className="w-8 h-8 rounded-full bg-destructive/10 text-destructive flex items-center justify-center font-bold text-sm flex-shrink-0">
        {number}
      </div>
      <p className="text-foreground pt-1">{text}</p>
    </div>
  )
}

function FeatureCard({ icon, title, description }: { icon: React.ReactNode; title: string; description: string }) {
  return (
    <Card className="p-8 hover:shadow-lg transition-shadow">
      <div className="w-14 h-14 rounded-lg bg-primary/10 text-primary flex items-center justify-center mb-4">
        {icon}
      </div>
      <h3 className="text-xl font-bold text-foreground mb-3">{title}</h3>
      <p className="text-muted-foreground leading-relaxed">{description}</p>
    </Card>
  )
}

function HowItWorksStep({
  number,
  title,
  description,
  icon,
}: { number: string; title: string; description: string; icon: React.ReactNode }) {
  return (
    <div className="flex gap-6 items-start">
      <div className="flex-shrink-0">
        <div className="w-12 h-12 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold text-xl">
          {number}
        </div>
      </div>
      <div className="flex-grow">
        <div className="flex items-center gap-3 mb-2">
          <div className="text-primary">{icon}</div>
          <h3 className="text-2xl font-bold text-foreground">{title}</h3>
        </div>
        <p className="text-lg text-muted-foreground leading-relaxed">{description}</p>
      </div>
    </div>
  )
}

function BenefitCard({ icon, title, description }: { icon: React.ReactNode; title: string; description: string }) {
  return (
    <Card className="p-6 hover:border-primary/50 transition-colors">
      <div className="flex items-start gap-3 mb-3">
        <div className="w-10 h-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center flex-shrink-0">
          {icon}
        </div>
        <h3 className="text-lg font-bold text-foreground">{title}</h3>
      </div>
      <p className="text-muted-foreground leading-relaxed">{description}</p>
    </Card>
  )
}

function ComparisonRow({
  feature,
  traditional,
  kathy,
  kathyBetter,
}: {
  feature: string
  traditional: string
  kathy: string
  kathyBetter: boolean
}) {
  return (
    <tr>
      <td className="px-6 py-4 text-sm font-medium text-foreground">{feature}</td>
      <td className="px-6 py-4 text-sm text-muted-foreground">{traditional}</td>
      <td className="px-6 py-4 text-sm text-primary font-medium flex items-center gap-2">
        {kathyBetter && <Check className="w-4 h-4 flex-shrink-0" />}
        {kathy}
      </td>
    </tr>
  )
}
