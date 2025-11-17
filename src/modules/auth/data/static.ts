export const barberDescriptions = [
  "Expert in modern and classic hairstyles with 10+ years of experience.",
  "Passionate about beard styling and precision haircuts.",
  "Creating trendy looks while maintaining timeless barbering techniques.",
  "Friendly and professional, ensuring every client leaves satisfied.",
  "Specialist in men's grooming, from fades to hair designs.",
  "Dedicated to making you look sharp and confident every day.",
  "Attention to detail with a focus on style and comfort.",
  "Experienced in all hair types, delivering personalized styles.",
  "Known for precision, speed, and excellent customer service.",
  "Combining creativity and classic barber skills to perfection."
];


export function getRandomDescription(): string {
  const randomIndex = Math.floor(Math.random() * barberDescriptions.length);
  return barberDescriptions[randomIndex];
}