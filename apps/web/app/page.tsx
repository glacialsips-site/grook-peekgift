import { redirect } from "next/navigation";

// The studio is the product. `/` was a dev sanity page; send people to the real thing.
// (When the landing lands, this becomes the landing.)
export default function Home() {
  redirect("/studio");
}
