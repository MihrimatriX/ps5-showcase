/**
 * Hand-written content: the recruiter's profile and the links. Games and GitHub projects are generated
 * (content/games.ts, content/github.ts). Only real information goes here; empty lists hide their section.
 */
import type { Achievement, MediaItem, Profile, Social } from "@/lib/types";
import { games } from "./games";
import { githubAvatar } from "./github";

// From the GitHub profile and its README (github.com/MihrimatriX).
export const profile: Profile = {
  name: "Ahmet Faruk Uzunkaya",
  onlineId: "MihrimatriX",
  title: { tr: "Full Stack .NET Geliştirici", en: "Full Stack .NET Developer" },
  location: { tr: "İstanbul, Türkiye", en: "Istanbul, Türkiye" },
  about: {
    tr: ".NET tarafında uçtan uca uygulamalar geliştiren bir Full Stack Developer'ım. Backend'de ASP.NET Core ve Node.js ile API'ler ve servisler yazıyor, frontend'de React, Next.js ve TypeScript ile arayüzler kuruyorum. Mobil tarafta React Native ve biraz da Flutter ile uygulamalar geliştiriyorum. Şu sıralar Three.js, bilgisayar grafikleri ve mikroservis mimarileri üzerine yoğunlaşıyorum.",
    en: "I'm a Full Stack Developer building end-to-end applications on .NET. On the backend I write APIs and services with ASP.NET Core and Node.js; on the frontend I build interfaces with React, Next.js and TypeScript. On mobile I build apps with React Native and a bit of Flutter. Lately I'm focusing on Three.js, computer graphics and microservice architectures.",
  },
  // Real jobs only: each entry shows as a card on the recruiter's profile.
  experience: [],
  skills: [
    { group: { tr: "Backend", en: "Backend" }, items: [".NET", "C#", "ASP.NET Core", "EF Core", "Node.js"] },
    { group: { tr: "Frontend", en: "Frontend" }, items: ["React", "Next.js", "JavaScript", "TypeScript", "Tailwind CSS", "Three.js", "Redux", "MUI"] },
    { group: { tr: "Mobil", en: "Mobile" }, items: ["React Native", "Flutter", "Dart"] },
    { group: { tr: "Veritabanı", en: "Databases" }, items: ["SQL Server", "PostgreSQL", "MongoDB", "Firebase"] },
    { group: { tr: "Bulut ve DevOps", en: "Cloud & DevOps" }, items: ["Google Cloud", "Docker", "Kubernetes", "Git"] },
  ],
  education: [],
  languages: [],
  avatar: githubAvatar,
};

export const projects = games;

/** Posts and talks. Empty: the Media tab shows just the links below. */
export const media: MediaItem[] = [];

/** Real certificates and awards only; the recruiter's profile and trophy list hide the section while it's empty. */
export const achievements: Achievement[] = [];

export const socials: Social[] = [
  { id: "instagram", label: "Instagram", handle: "@_ahmetfuzunkaya", url: "https://www.instagram.com/_ahmetfuzunkaya" },
  { id: "github", label: "GitHub", handle: "MihrimatriX", url: "https://github.com/MihrimatriX" },
  { id: "linkedin", label: "LinkedIn", handle: "in/ahmet-fuzunkaya", url: "https://www.linkedin.com/in/ahmet-fuzunkaya/" },
  { id: "mail", label: "E-posta", handle: "iletisim@ahmetfuzunkaya.com", url: "mailto:iletisim@ahmetfuzunkaya.com" },
  { id: "blog", label: "ahmetfuzunkaya.com", handle: "ahmetfuzunkaya.com", url: "https://ahmetfuzunkaya.com" },
];
