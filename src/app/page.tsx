import { LmsApp } from "@/components/lms-app";
import { SetupRequired } from "@/components/setup-required";

export default function Home() {
  if (!process.env.NEXT_PUBLIC_CONVEX_URL) {
    return <SetupRequired />;
  }

  return <LmsApp />;
}
