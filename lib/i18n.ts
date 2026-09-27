export type Lang = 'fr' | 'en' | 'de' | 'es';

interface Strings {
  // Écran d'accueil
  tagline: string;
  startGame: string;
  join: string;
  // Écran config
  modeSection: string;
  comingSoon: string;
  createGame: string;
  pseudoTitle: string;
  pseudoSubtitle: string;
  pseudoPlaceholder: string;
  pseudoTooShort: string;
}

const translations: Record<Lang, Strings> = {
  fr: {
    tagline: 'Cuisine tes amis sans passer à la casserole !',
    startGame: 'Dresser une table',
    join: 'Rejoindre',
    modeSection: 'On cuisine quoi ce soir ?',
    comingSoon: 'bientôt au menu !',
    createGame: 'Créer la partie',
    pseudoTitle: 'Ton pseudo',
    pseudoSubtitle: "Comment tu t'appelles, chef ?",
    pseudoPlaceholder: 'Chef Saucissier',
    pseudoTooShort: 'Pseudo trop court',
  },
  en: {
    tagline: "The kitchen's in play, you're on the menu",
    startGame: 'Start game',
    join: 'Join',
    modeSection: 'Theme',
    comingSoon: 'Coming soon!',
    createGame: 'Create game',
    pseudoTitle: 'Your nickname',
    pseudoSubtitle: "What's your name, chef?",
    pseudoPlaceholder: 'Chef Baguette',
    pseudoTooShort: 'Nickname too short',
  },
  de: {
    tagline: 'Die Küche im Spiel, du stehst auf der Karte',
    startGame: 'Spiel starten',
    join: 'Beitreten',
    modeSection: 'Thema',
    comingSoon: 'Demnächst!',
    createGame: 'Spiel erstellen',
    pseudoTitle: 'Dein Nickname',
    pseudoSubtitle: 'Wie heißt du, Chef?',
    pseudoPlaceholder: 'Chef Bratwurst',
    pseudoTooShort: 'Nickname zu kurz',
  },
  es: {
    tagline: 'La cocina en juego, tú en el menú',
    startGame: 'Iniciar partida',
    join: 'Unirse',
    modeSection: 'Temática',
    comingSoon: '¡Próximamente!',
    createGame: 'Crear partida',
    pseudoTitle: 'Tu apodo',
    pseudoSubtitle: '¿Cómo te llamas, jefe?',
    pseudoPlaceholder: 'Chef Paella',
    pseudoTooShort: 'Apodo demasiado corto',
  },
};

export function t(lang: Lang, key: keyof Strings): string {
  return translations[lang][key];
}

export const LANGUAGES: { code: Lang; label: string }[] = [
  { code: 'fr', label: 'Français' },
  { code: 'en', label: 'English' },
  { code: 'de', label: 'Deutsch' },
  { code: 'es', label: 'Español' },
];
