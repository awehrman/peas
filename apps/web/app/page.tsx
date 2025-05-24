import { colors } from "@peas/theme";

function ColorSwatch({
  name,
  value,
  textColor = "text-gray-800",
}: {
  name: string;
  value: string;
  textColor?: string;
}) {
  return (
    <div className="flex flex-col">
      <div
        className="w-24 h-16 rounded-lg border border-gray-200 flex items-end p-2"
        style={{ backgroundColor: value }}
      >
        <span className={`text-xs font-mono ${textColor}`}>{value}</span>
      </div>
      <span className="text-sm font-medium mt-2 text-center">{name}</span>
    </div>
  );
}

function ColorScale({
  title,
  colorScale,
}: {
  title: string;
  colorScale: Record<string, string>;
}) {
  return (
    <div className="mb-8">
      <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-11 gap-4">
        {Object.entries(colorScale).map(([key, value]) => (
          <ColorSwatch
            key={key}
            name={key}
            value={value}
            textColor={
              key === "foreground" || Number.parseInt(key) >= 700
                ? "text-white"
                : "text-gray-800"
            }
          />
        ))}
      </div>
    </div>
  );
}

export default function ThemeColorsPage() {
  return (
    <div className="min-h-screen bg-background p-8">
      <div className="max-w-7xl mx-auto">
        <header className="mb-12">
          <h1 className="text-4xl font-bold text-foreground mb-4">
            Peas Design System
          </h1>
          <p className="text-xl text-muted-foreground">
            Theme Color Palette Testing
          </p>
        </header>

        <div className="space-y-12">
          {/* Primary Colors */}
          <ColorScale title="Primary Colors" colorScale={colors.primary} />

          {/* Secondary Colors */}
          <ColorScale title="Secondary Colors" colorScale={colors.secondary} />

          {/* Semantic Colors */}
          <div className="mb-8">
            <h3 className="text-lg font-semibold mb-4 text-gray-800">
              Semantic Colors
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
              <ColorSwatch
                name="Destructive"
                value={colors.destructive.DEFAULT}
                textColor="text-white"
              />
              <ColorSwatch
                name="Destructive Foreground"
                value={colors.destructive.foreground}
                textColor="text-gray-800"
              />
              <ColorSwatch
                name="Muted"
                value={colors.muted.DEFAULT}
                textColor="text-gray-800"
              />
              <ColorSwatch
                name="Muted Foreground"
                value={colors.muted.foreground}
                textColor="text-white"
              />
              <ColorSwatch
                name="Accent"
                value={colors.accent.DEFAULT}
                textColor="text-white"
              />
              <ColorSwatch
                name="Accent Foreground"
                value={colors.accent.foreground}
                textColor="text-gray-800"
              />
            </div>
          </div>

          {/* Surface Colors */}
          <div className="mb-8">
            <h3 className="text-lg font-semibold mb-4 text-gray-800">
              Surface Colors
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
              <ColorSwatch
                name="Background"
                value={colors.background}
                textColor="text-gray-800"
              />
              <ColorSwatch
                name="Foreground"
                value={colors.foreground}
                textColor="text-white"
              />
              <ColorSwatch
                name="Card"
                value={colors.card.DEFAULT}
                textColor="text-gray-800"
              />
              <ColorSwatch
                name="Card Foreground"
                value={colors.card.foreground}
                textColor="text-white"
              />
              <ColorSwatch
                name="Popover"
                value={colors.popover.DEFAULT}
                textColor="text-gray-800"
              />
              <ColorSwatch
                name="Popover Foreground"
                value={colors.popover.foreground}
                textColor="text-white"
              />
            </div>
          </div>

          {/* Border & Input Colors */}
          <div className="mb-8">
            <h3 className="text-lg font-semibold mb-4 text-gray-800">
              Border & Input Colors
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              <ColorSwatch
                name="Border"
                value={colors.border}
                textColor="text-gray-800"
              />
              <ColorSwatch
                name="Input"
                value={colors.input}
                textColor="text-gray-800"
              />
              <ColorSwatch
                name="Ring"
                value={colors.ring}
                textColor="text-white"
              />
            </div>
          </div>

          {/* Live Examples */}
          <div className="mb-8">
            <h3 className="text-lg font-semibold mb-4 text-gray-800">
              Live Examples
            </h3>
            <div className="space-y-4">
              <div className="p-6 bg-card border border-border rounded-lg">
                <h4 className="text-card-foreground font-semibold mb-2">
                  Card Component
                </h4>
                <p className="text-muted-foreground">
                  This is how a card looks with the theme colors.
                </p>
                <button className="mt-4 px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors">
                  Primary Button
                </button>
              </div>

              <div className="p-6 bg-secondary text-secondary-foreground rounded-lg">
                <h4 className="font-semibold mb-2">Secondary Background</h4>
                <p className="opacity-90">
                  This demonstrates secondary colors in action.
                </p>
                <button className="mt-4 px-4 py-2 bg-accent text-accent-foreground rounded-md hover:bg-accent/90 transition-colors">
                  Accent Button
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
