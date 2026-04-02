import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;

if (!supabaseUrl || !supabaseKey) {
  // eslint-disable-next-line no-console
  console.warn("SUPABASE_URL and SUPABASE_KEY are not set. Database operations will fail.");
}

export const supabase = createClient(supabaseUrl || "", supabaseKey || "");

export async function initDb() {
  // Supabase tables should be created via the SQL script provided.
  // This function is kept for compatibility with server.js.
  return Promise.resolve();
}

export async function listMedicines() {
  const { data, error } = await supabase
    .from("medicines")
    .select("*")
    .order("name", { ascending: true });

  if (error) throw error;
  return data.map(normalizeMedicine);
}

export async function getMedicineByBarcode(barcode) {
  const { data, error } = await supabase
    .from("medicines")
    .select("*")
    .eq("barcode", barcode)
    .single();

  if (error && error.code !== "PGRST116") throw error; // PGRST116 is 'no rows'
  return data ? normalizeMedicine(data) : null;
}

export async function getMedicineByBarcodeAndHospital(barcode, hospital) {
  const { data, error } = await supabase
    .from("medicines")
    .select("*")
    .eq("barcode", barcode)
    .eq("hospital", hospital)
    .single();

  if (error && error.code !== "PGRST116") throw error;
  return data ? normalizeMedicine(data) : null;
}

export async function createMedicine(medicine) {
  const payload = serializeMedicine(medicine);
  const { data, error } = await supabase
    .from("medicines")
    .insert([payload])
    .select()
    .single();

  if (error) {
    if (error.code === "23505") {
      throw new Error("A medicine with this barcode already exists in this hospital.");
    }
    throw error;
  }
  return normalizeMedicine(data);
}

export async function updateMedicine(barcode, medicine, originalHospital) {
  const payload = serializeMedicine({ ...medicine, barcode });
  const lookupHospital = originalHospital || payload.hospital;

  const { data, error } = await supabase
    .from("medicines")
    .update(payload)
    .eq("barcode", barcode)
    .eq("hospital", lookupHospital)
    .select()
    .single();

  if (error) throw error;
  return normalizeMedicine(data);
}

export async function deleteMedicineForHospital(barcode, hospital) {
  const { error } = await supabase
    .from("medicines")
    .delete()
    .eq("barcode", barcode)
    .eq("hospital", hospital);

  if (error) throw error;
}

export async function replaceMedicines(medicines) {
  // Delete all and insert new
  const { error: deleteError } = await supabase.from("medicines").delete().neq("id", 0);
  if (deleteError) throw deleteError;

  const { error: insertError } = await supabase
    .from("medicines")
    .insert(medicines.map(serializeMedicine));

  if (insertError) throw insertError;
}

export async function listExchangeRequests() {
  const { data, error } = await supabase
    .from("exchange_requests")
    .select("*")
    .order("requestedAt", { ascending: false });

  if (error) throw error;
  return data.map(normalizeRequest);
}

export async function getExchangeRequest(id) {
  const { data, error } = await supabase
    .from("exchange_requests")
    .select("*")
    .eq("id", id)
    .single();

  if (error && error.code !== "PGRST116") throw error;
  return data ? normalizeRequest(data) : null;
}

export async function createExchangeRequest(request) {
  const payload = {
    ...request,
    declinedBy: request.declinedBy || []
  };
  const { data, error } = await supabase
    .from("exchange_requests")
    .insert([payload])
    .select()
    .single();

  if (error) throw error;
  return normalizeRequest(data);
}

export async function fulfillExchangeRequest(id, decision, actorHospital) {
  const current = await getExchangeRequest(id);
  if (!current) return { ok: false, error: "Exchange request not found." };
  if (current.status !== "Pending") {
    return { ok: false, error: "Request already processed." };
  }

  if (decision.status === "Declined") {
    const declinedBy = new Set(current.declinedBy || []);
    if (actorHospital) {
      declinedBy.add(actorHospital);
    }
    const shouldFinalize = current.targetHospital !== "Any" && current.targetHospital === actorHospital;
    const updated = await updateExchangeRequest(id, {
      status: shouldFinalize ? "Declined" : "Pending",
      declineReason: shouldFinalize ? decision.declineReason || "" : current.declineReason || "",
      declinedBy: Array.from(declinedBy)
    });
    return { ok: true, request: updated };
  }

  if (decision.status !== "Accepted") {
    return { ok: false, error: "Invalid decision." };
  }

  const offerHospital = actorHospital || current.targetHospital;
  if (!offerHospital) {
    return { ok: false, error: "No hospital selected to fulfill the request." };
  }
  const updated = await updateExchangeRequest(id, {
    status: "Accepted",
    declineReason: "",
    targetHospital: offerHospital,
    declinedBy: []
  });
  return { ok: true, request: updated };
}

export async function updateExchangeRequest(id, updates) {
  const { data, error } = await supabase
    .from("exchange_requests")
    .update(updates)
    .eq("id", id)
    .select()
    .single();

  if (error) throw error;
  return normalizeRequest(data);
}

export async function replaceExchangeRequests(requests) {
  const { error: deleteError } = await supabase.from("exchange_requests").delete().neq("id", "0");
  if (deleteError) throw deleteError;

  const { error: insertError } = await supabase
    .from("exchange_requests")
    .insert(requests);

  if (insertError) throw insertError;
}

export async function countMedicines() {
  const { count, error } = await supabase
    .from("medicines")
    .select("*", { count: "exact", head: true });

  if (error) throw error;
  return count || 0;
}

export async function countExchangeRequests() {
  const { count, error } = await supabase
    .from("exchange_requests")
    .select("*", { count: "exact", head: true });

  if (error) throw error;
  return count || 0;
}

export async function getUserByEmail(email) {
  const { data, error } = await supabase
    .from("users")
    .select("*")
    .eq("email", email)
    .single();

  if (error && error.code !== "PGRST116") throw error;
  return data || null;
}

export async function ensureUser(user) {
  const existing = await getUserByEmail(user.email);
  if (!existing) {
    const { data, error } = await supabase
      .from("users")
      .insert([user])
      .select()
      .single();
    if (error) throw error;
    return data;
  }
  if (!existing.hospital && user.hospital) {
    const { data, error } = await supabase
      .from("users")
      .update({ hospital: user.hospital })
      .eq("email", user.email)
      .select()
      .single();
    if (error) throw error;
    return data;
  }
  return existing;
}

export async function createSession(session) {
  const { data, error } = await supabase
    .from("sessions")
    .insert([session])
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function getSession(sessionId) {
  const { data, error } = await supabase
    .from("sessions")
    .select("*")
    .eq("id", sessionId)
    .single();

  if (error && error.code !== "PGRST116") throw error;
  return data || null;
}

export async function deleteSession(sessionId) {
  const { error } = await supabase
    .from("sessions")
    .delete()
    .eq("id", sessionId);

  if (error) throw error;
}

export async function clearSessions() {
  const { error } = await supabase.from("sessions").delete().neq("id", "0");
  if (error) throw error;
}

function normalizeMedicine(row) {
  return {
    ...row,
    excess: Boolean(row.excess),
    reorderLevel: row.reorderLevel === null ? undefined : row.reorderLevel
  };
}

function serializeMedicine(medicine) {
  const { id, created_at, ...rest } = medicine; // Remove ID and internal timestamps if present
  return {
    ...rest,
    excess: !!medicine.excess,
    reorderLevel: Number.isFinite(medicine.reorderLevel) ? medicine.reorderLevel : null,
    addedAt: medicine.addedAt || new Date().toISOString()
  };
}

function normalizeRequest(row) {
  return {
    ...row,
    declinedBy: Array.isArray(row.declinedBy) ? row.declinedBy : []
  };
}
