"use client";

import { useSyncExternalStore } from "react";

const THEME_EVENT = "nbc-theme-change";
const AUTH_EVENT = "nbc-auth-change";

function subscribeTheme(callback) {
  const handleStorage = (event) => {
    if (!event.key || event.key === "nbc-theme") callback();
  };

  window.addEventListener(THEME_EVENT, callback);
  window.addEventListener("storage", handleStorage);
  return () => {
    window.removeEventListener(THEME_EVENT, callback);
    window.removeEventListener("storage", handleStorage);
  };
}

function getThemeSnapshot() {
  const saved = window.localStorage.getItem("nbc-theme");
  return saved === null ? true : saved === "dark";
}

function getServerThemeSnapshot() {
  return true;
}

export function useThemePreference() {
  return useSyncExternalStore(subscribeTheme, getThemeSnapshot, getServerThemeSnapshot);
}

export function setThemePreference(isDark) {
  window.localStorage.setItem("nbc-theme", isDark ? "dark" : "light");
  window.dispatchEvent(new Event(THEME_EVENT));
}

function subscribeUser(callback) {
  const handleStorage = (event) => {
    if (!event.key || event.key === "user_token" || event.key === "user_data") callback();
  };

  window.addEventListener("storage", handleStorage);
  window.addEventListener(AUTH_EVENT, callback);
  return () => {
    window.removeEventListener("storage", handleStorage);
    window.removeEventListener(AUTH_EVENT, callback);
  };
}

function getUserSnapshot() {
  if (!window.localStorage.getItem("user_token")) return null;
  return window.localStorage.getItem("user_data");
}

function getServerUserSnapshot() {
  return null;
}

export function useStoredUserData() {
  return useSyncExternalStore(subscribeUser, getUserSnapshot, getServerUserSnapshot);
}

export function notifyUserStorageChanged() {
  window.dispatchEvent(new Event(AUTH_EVENT));
}
