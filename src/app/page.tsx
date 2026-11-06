import { redirect } from "next/navigation";

/** The platform opens on the trainer home. Switch roles from the avatar menu. */
export default function Home() {
  redirect("/trainer");
}
