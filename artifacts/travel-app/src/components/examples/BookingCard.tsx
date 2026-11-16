import { BookingCard } from '../BookingCard';

export default function BookingCardExample() {
  return (
    <div className="space-y-4 p-4 max-w-md">
      <BookingCard
        id="1"
        type="flight"
        title="Paris → Rome"
        confirmationNumber="AF1234"
        date="Dec 15, 2025"
        time="10:30 AM - 12:45 PM"
        location="CDG Airport"
        details="Air France • Economy • 2h 15m"
        status="confirmed"
        onClick={() => console.log('Flight clicked')}
      />
      
      <BookingCard
        id="2"
        type="hotel"
        title="Hotel Plaza Athénée"
        confirmationNumber="HTL789456"
        date="Dec 10-15, 2025"
        location="25 Avenue Montaigne, Paris"
        details="Deluxe Room • 5 nights • 2 adults"
        status="confirmed"
        onClick={() => console.log('Hotel clicked')}
      />
      
      <BookingCard
        id="3"
        type="train"
        title="Rome → Florence"
        confirmationNumber="TRN456123"
        date="Dec 18, 2025"
        time="9:00 AM - 10:30 AM"
        location="Roma Termini"
        details="Trenitalia • First Class"
        status="pending"
        onClick={() => console.log('Train clicked')}
      />
    </div>
  );
}
