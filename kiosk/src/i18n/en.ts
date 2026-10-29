import type { HowToStep } from "@/types";

export const en = {
  home: {
    university: "KASETSART UNIVERSITY",
    campus: "KAMPHAENG SAEN CAMPUS",
    tagline:
      "Step into a moment of pride with the graduation gown that stands beside you on your day of success.",
    start: "Let's start",
    tapToBegin: "Tap the screen to begin",
  },
  howTo: {
    title: "How to Join",
    steps: [
      { title: "Start", body: "Tap the screen to begin." },
      {
        title: "Instructions",
        body: "Read the instructions, then tap Accept.",
      },
      {
        title: "Privacy Consent (PDPA)",
        body: "Tap Agree to accept the privacy terms.",
      },
      {
        title: "Degree & Faculty",
        body: [
          "Choose your degree: Bachelor’s, Master’s, or Doctorate",
          "Choose 1 of 9 faculties",
          "Tap Next",
        ],
        bulleted: true,
      },
      { title: "Choose Background", body: "Pick a background, then tap Next." },
      {
        title: "Take Your Photo",
        body: "Tap the shutter button. A 5-second countdown will start, and your photo will be taken automatically.",
      },
      {
        title: "Your Result",
        body: "See your photo combined with your chosen outfit and background.",
      },
    ] as HowToStep[],
  },
  pdpa: {
    title: "Consent to the Collection, Use and Disclosure of Personal Data",
    intro:
      "Kasetsart University, Kamphaeng Saen Campus values your privacy and therefore asks for your consent to collect, use and process your personal data.\nI (the user of the photo service) consent to the use of my personal data, as follows:",
    items: [
      "Facial photo: to take your photo and display it on the screen.",
      "Educational information: faculty and academic level, for display purposes.",
    ],
    processor:
      "Purpose: to provide a virtual photo service for you. Your photo will be processed by an external AI provider (Decart) outside Thailand. Your data will be stored for 7 days after the event ends.",
    retention:
      "I acknowledge that I give my consent by pressing the Accept button, or decline by pressing the Decline button.",
    yes: "Accept",
    no: "Decline",
  },
  grade: {
    title: "Which Faculty Represents Your Success",
    degreePrompt: "Tell us, which degree holds your pride...",
    facultyPrompt: "Your success story is from..",
  },
  preview: {
    title: "Pick your backdrop & show your pride",
    subtitle: "Pick your favorite spot!..",
  },
  camera: {
    title: "Let's Start",
    subtitle: "Let's start creating your unforgettable moments.",
    getReady: "Let’s Get Ready..",
    hold: "Hold it…",
    play: "Let’s Play !",
    shutter: "Take photo",
    dressing: "Preparing your photo…",
  },
  /** Shown in turn while the photo is made, so the wait has something to read. */
  generating: [
    "Creating your photo…",
    "Polishing your photo…",
    "Getting the light just right…",
    "Sharpening the details…",
  ],
  generatingScene: "Preparing your photo…",
  result: {
    title: "Your Impressionable Moment",
    caption: "Keep this photo as a memento of your special day",
    scan: "Scan the QR code to download your photo to your phone",
    qr: "QR code",
  },
  errors: {
    network: "Internet connection lost. Please call staff.",
    ai: "We couldn't create your photo. Please try again.",
    no_person:
      "We couldn't see you in the frame. Please stand on the mark and try again.",
    camera: "The camera is not working. Please call staff.",
  },
  actions: {
    next: "Next",
    retake: "RETAKE",
    home: "HOME",
    tryAgain: "TRY AGAIN",
    back: "Back",
    close: "Close",
  },
};

export type Messages = typeof en;
