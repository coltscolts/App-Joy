import SwiftUI
import WidgetKit

// MARK: - Datos compartidos con la app (lib/widgetSync.ts)

private let appGroup = "group.com.joyplann.app"
private let nextTripKey = "nextTrip"

struct WidgetTrip: Decodable {
  let name: String
  let destination: String
  let departureAt: String
  let startDate: String
  let endDate: String
  let detail: String?

  var departure: Date? {
    let formatter = ISO8601DateFormatter()
    formatter.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
    return formatter.date(from: departureAt) ?? ISO8601DateFormatter().date(from: departureAt)
  }

  /// Fin del viaje: final del último día, hora local.
  var end: Date? {
    let formatter = DateFormatter()
    formatter.calendar = Calendar(identifier: .gregorian)
    formatter.dateFormat = "yyyy-MM-dd"
    guard let day = formatter.date(from: endDate) else { return nil }
    return Calendar.current.date(byAdding: .day, value: 1, to: day)
  }

  static func load() -> WidgetTrip? {
    guard let raw = UserDefaults(suiteName: appGroup)?.string(forKey: nextTripKey),
          let data = raw.data(using: .utf8) else { return nil }
    return try? JSONDecoder().decode(WidgetTrip.self, from: data)
  }
}

// MARK: - Textos (es / en)

private let isSpanish = Locale.current.language.languageCode?.identifier == "es"

private enum L {
  static let nextTrip = isSpanish ? "PRÓXIMO VIAJE" : "NEXT TRIP"
  static let inProgress = isSpanish ? "EN CURSO" : "IN PROGRESS"
  static let days = isSpanish ? "días" : "days"
  static let day = isSpanish ? "día" : "day"
  static let noTrip = isSpanish ? "Sin viajes próximos" : "No upcoming trips"
  static let planOne = isSpanish ? "Abre JoyPlann para planear uno" : "Open JoyPlann to plan one"
  static let today = isSpanish ? "¡Hoy!" : "Today!"
  static let enjoy = isSpanish ? "¡Disfruta el viaje!" : "Enjoy your trip!"
  static let widgetName = isSpanish ? "Cuenta atrás" : "Countdown"
  static let widgetDescription = isSpanish ? "Días que faltan para tu próximo viaje." : "Days left until your next trip."
}

// MARK: - Timeline

struct CountdownEntry: TimelineEntry {
  let date: Date
  let trip: WidgetTrip?
}

struct CountdownProvider: TimelineProvider {
  func placeholder(in context: Context) -> CountdownEntry {
    CountdownEntry(date: .now, trip: WidgetTrip(
      name: "Madrid", destination: "Madrid, España",
      departureAt: ISO8601DateFormatter().string(from: .now.addingTimeInterval(12 * 86_400)),
      startDate: "", endDate: "", detail: "AM 001"))
  }

  func getSnapshot(in context: Context, completion: @escaping (CountdownEntry) -> Void) {
    completion(context.isPreview && WidgetTrip.load() == nil ? placeholder(in: context) : CountdownEntry(date: .now, trip: WidgetTrip.load()))
  }

  func getTimeline(in context: Context, completion: @escaping (Timeline<CountdownEntry>) -> Void) {
    let trip = WidgetTrip.load()
    let now = Date.now
    // Una entrada por hora durante 24 h: los días cambian a medianoche y las
    // últimas 24 h se muestran con un contador en vivo (Text .timer).
    var entries = (0..<24).compactMap { hour in
      Calendar.current.date(byAdding: .hour, value: hour, to: now).map { CountdownEntry(date: $0, trip: trip) }
    }
    if let departure = trip?.departure, departure > now, departure < now.addingTimeInterval(86_400) {
      entries.append(CountdownEntry(date: departure, trip: trip))
      entries.sort { $0.date < $1.date }
    }
    completion(Timeline(entries: entries, policy: .atEnd))
  }
}

// MARK: - Vistas

private func daysUntil(_ date: Date, from now: Date) -> Int {
  let calendar = Calendar.current
  return calendar.dateComponents([.day], from: calendar.startOfDay(for: now), to: calendar.startOfDay(for: date)).day ?? 0
}

struct CountdownView: View {
  @Environment(\.widgetFamily) private var family
  let entry: CountdownEntry

  var body: some View {
    Group {
      if let trip = entry.trip, let departure = trip.departure {
        tripView(trip, departure: departure)
      } else {
        emptyView
      }
    }
    .widgetURL(URL(string: "joyplann://"))
  }

  @ViewBuilder
  private func tripView(_ trip: WidgetTrip, departure: Date) -> some View {
    let now = entry.date
    let ongoing = departure <= now && (trip.end.map { now < $0 } ?? true)
    let days = daysUntil(departure, from: now)
    let underADay = departure > now && departure.timeIntervalSince(now) < 86_400

    switch family {
    case .accessoryInline:
      if ongoing {
        Text("✈︎ \(trip.name) · \(L.inProgress.lowercased())")
      } else {
        Text("✈︎ \(trip.name) · \(days) \(days == 1 ? L.day : L.days)")
      }
    case .accessoryRectangular:
      VStack(alignment: .leading, spacing: 2) {
        Text(trip.name).font(.headline).lineLimit(1)
        if ongoing {
          Text(L.enjoy).font(.caption)
        } else if underADay {
          Text(departure, style: .timer).font(.title3.monospacedDigit())
        } else {
          Text("\(days) \(days == 1 ? L.day : L.days)").font(.title3.bold())
        }
      }
    default:
      VStack(alignment: .leading, spacing: 4) {
        HStack {
          Text(ongoing ? L.inProgress : L.nextTrip)
            .font(.caption2.weight(.bold))
            .foregroundStyle(.white.opacity(0.75))
          Spacer()
          Image(systemName: trip.detail != nil ? "airplane" : "safari")
            .font(.caption)
            .foregroundStyle(.white.opacity(0.75))
        }
        Spacer(minLength: 0)
        if ongoing {
          Text(L.enjoy).font(.title3.bold()).foregroundStyle(.white)
        } else if underADay {
          Text(departure, style: .timer)
            .font(.system(size: 30, weight: .bold).monospacedDigit())
            .foregroundStyle(.white)
            .minimumScaleFactor(0.6)
        } else {
          HStack(alignment: .firstTextBaseline, spacing: 4) {
            Text(days == 0 ? L.today : "\(days)")
              .font(.system(size: family == .systemSmall ? 44 : 52, weight: .bold).monospacedDigit())
              .foregroundStyle(.white)
              .minimumScaleFactor(0.5)
            if days > 0 {
              Text(days == 1 ? L.day : L.days).font(.headline).foregroundStyle(.white.opacity(0.85))
            }
          }
        }
        Text(trip.name).font(.subheadline.bold()).foregroundStyle(.white).lineLimit(1)
        Text(family == .systemMedium && trip.detail != nil ? "\(trip.destination) · \(trip.detail!)" : trip.destination)
          .font(.caption)
          .foregroundStyle(.white.opacity(0.8))
          .lineLimit(1)
      }
    }
  }

  private var emptyView: some View {
    VStack(alignment: .leading, spacing: 4) {
      Image(systemName: "suitcase.rolling").font(.title2).foregroundStyle(.white)
      Spacer(minLength: 0)
      Text(L.noTrip).font(.subheadline.bold()).foregroundStyle(.white)
      if family != .accessoryInline && family != .accessoryRectangular {
        Text(L.planOne).font(.caption).foregroundStyle(.white.opacity(0.8))
      }
    }
  }
}

// MARK: - Widget

struct JoyPlannCountdownWidget: Widget {
  let kind = "JoyPlannCountdown"

  var body: some WidgetConfiguration {
    StaticConfiguration(kind: kind, provider: CountdownProvider()) { entry in
      CountdownView(entry: entry)
        .containerBackground(for: .widget) {
          LinearGradient(colors: [Color(red: 0.12, green: 0.44, blue: 0.85), Color(red: 0.04, green: 0.24, blue: 0.57)],
                         startPoint: .topLeading, endPoint: .bottomTrailing)
        }
    }
    .configurationDisplayName(L.widgetName)
    .description(L.widgetDescription)
    .supportedFamilies([.systemSmall, .systemMedium, .accessoryRectangular, .accessoryInline])
  }
}

@main
struct JoyPlannWidgetBundle: WidgetBundle {
  var body: some Widget {
    JoyPlannCountdownWidget()
  }
}
