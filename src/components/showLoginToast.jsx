"use client"

import React, { useEffect } from "react"
import { useSearchParams } from "next/navigation"
import toast from "react-hot-toast"

function ShowLoginToast() {
    const searchParams = useSearchParams()
    const unauthenticated = searchParams.get("unauthenticated")

    useEffect(() => {
        if (unauthenticated === "true") {
            toast.error("Unauthorized, Please login to continue")
        };
        return () => { }
    }, [unauthenticated])

    return null
}

export default React.memo(ShowLoginToast);