"use client"

import React, { useEffect } from "react"
import toast from "react-hot-toast"

function ShowLoginToast() {
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const unauthenticated = params.get("unauthenticated")

    if (unauthenticated === "true") {
      toast.error("Unauthorized, Please login to continue")
    }
  }, [])

  return null
}

export default React.memo(ShowLoginToast)
