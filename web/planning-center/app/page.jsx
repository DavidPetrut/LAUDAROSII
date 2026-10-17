import { redirect } from "next/navigation";

// Intrarea: ducem direct la Songs (prima felie a web-ului). Guard-ul de auth e în (app)/layout.
export default function Home() {
  redirect("/songs");
}
