import { Button } from "@/components/ui/button";
import Link from "next/link";

export default function Page() {
    return (
        <div>
            <h1>Home</h1>
            <Button>Hello World</Button>
            <Link href="/about">About</Link>
        </div>
    );
}
