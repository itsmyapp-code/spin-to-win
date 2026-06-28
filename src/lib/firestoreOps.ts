'use client';

import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  query,
  where,
  limit,
  orderBy,
  serverTimestamp,
  deleteDoc,
  Firestore,
} from 'firebase/firestore';
import type { Customer, WheelConfig, StaffRole, PrizeTier } from './types';
import { DEFAULT_PRIZES } from './types';

// ─── Collection paths ────────────────────────────────────────────────────────
const CONFIG_DOC = 'spinConfig/main';
const CUSTOMERS_COL = 'spinCustomers';
const ROLES_COL = 'spinRoles';

// ─── Wheel Config ─────────────────────────────────────────────────────────────
export async function getWheelConfig(db: Firestore): Promise<WheelConfig> {
  const snap = await getDoc(doc(db, CONFIG_DOC));
  if (!snap.exists()) {
    return {
      prizes: DEFAULT_PRIZES,
      updatedAt: new Date().toISOString(),
      updatedByEmail: 'system',
    };
  }
  return snap.data() as WheelConfig;
}

export async function saveWheelConfig(
  db: Firestore,
  prizes: PrizeTier[],
  userEmail: string,
  customTerms?: string
): Promise<void> {
  const config: WheelConfig = {
    prizes,
    updatedAt: new Date().toISOString(),
    updatedByEmail: userEmail,
    customTerms: customTerms || '',
  };
  await setDoc(doc(db, CONFIG_DOC), config);
}

// ─── Customers ────────────────────────────────────────────────────────────────
export async function getCustomerByToken(
  db: Firestore,
  token: string
): Promise<Customer | null> {
  const q = query(
    collection(db, CUSTOMERS_COL),
    where('token', '==', token),
    limit(1)
  );
  const snap = await getDocs(q);
  if (snap.empty) return null;
  return snap.docs[0].data() as Customer;
}

export async function getAllCustomers(db: Firestore): Promise<Customer[]> {
  const q = query(collection(db, CUSTOMERS_COL), orderBy('createdAt', 'desc'));
  const snap = await getDocs(q);
  return snap.docs.map((d) => d.data() as Customer);
}

export async function upsertCustomer(
  db: Firestore,
  customer: Customer
): Promise<void> {
  await setDoc(doc(db, CUSTOMERS_COL, customer.id), customer);
}

export async function saveSpinResult(
  db: Firestore,
  customerId: string,
  prizeId: string,
  prizeName: string,
  prizeCode: string,
  newSpinsCount: number,
  spinStatus: 'fresh' | 'spun',
  prizesWon: Customer['prizesWon']
): Promise<void> {
  await updateDoc(doc(db, CUSTOMERS_COL, customerId), {
    spinStatus,
    spinsCount: newSpinsCount,
    prizeId,
    prizeName,
    prizeCode,
    redeemedAt: null,
    redeemedByEmail: null,
    prizesWon,
  });
}

export async function getCustomerByCode(
  db: Firestore,
  code: string
): Promise<Customer | null> {
  // First attempt direct check
  const q = query(
    collection(db, CUSTOMERS_COL),
    where('prizeCode', '==', code),
    limit(1)
  );
  const snap = await getDocs(q);
  if (!snap.empty) {
    return snap.docs[0].data() as Customer;
  }

  // Fallback: Scan in-memory (useful for redeeming non-last spins)
  const allSnap = await getDocs(query(collection(db, CUSTOMERS_COL)));
  for (const d of allSnap.docs) {
    const c = d.data() as Customer;
    if (c.prizesWon?.some((p) => p.prizeCode === code)) {
      return c;
    }
  }
  return null;
}

export async function burnVoucher(
  db: Firestore,
  customerId: string,
  staffEmail: string,
  prizeCodeToBurn?: string
): Promise<void> {
  const docRef = doc(db, CUSTOMERS_COL, customerId);
  const snap = await getDoc(docRef);
  if (!snap.exists()) return;
  const customer = snap.data() as Customer;

  const redeemedAt = new Date().toISOString();
  const updateData: any = {};

  if (!prizeCodeToBurn || customer.prizeCode === prizeCodeToBurn) {
    updateData.redeemedAt = redeemedAt;
    updateData.redeemedByEmail = staffEmail;
  }

  if (customer.prizesWon) {
    updateData.prizesWon = customer.prizesWon.map((p) => {
      if (p.prizeCode === (prizeCodeToBurn || customer.prizeCode)) {
        return {
          ...p,
          redeemedAt,
          redeemedByEmail: staffEmail,
        };
      }
      return p;
    });
  }

  await updateDoc(docRef, updateData);
}

export async function bulkCreateCustomers(
  db: Firestore,
  customers: Customer[]
): Promise<void> {
  await Promise.all(customers.map((c) => setDoc(doc(db, CUSTOMERS_COL, c.id), c)));
}

// ─── Staff Roles ──────────────────────────────────────────────────────────────
export async function getStaffRole(
  db: Firestore,
  email: string
): Promise<StaffRole | null> {
  const snap = await getDoc(doc(db, ROLES_COL, email.toLowerCase()));
  if (!snap.exists()) return null;
  return snap.data() as StaffRole;
}

export async function setStaffRole(
  db: Firestore,
  email: string,
  role: StaffRole['role'],
  displayName: string
): Promise<void> {
  const staffRole: StaffRole = {
    role,
    displayName,
    createdAt: new Date().toISOString(),
  };
  await setDoc(doc(db, ROLES_COL, email.toLowerCase()), staffRole);
}

export async function deleteStaffRole(
  db: Firestore,
  email: string
): Promise<void> {
  await deleteDoc(doc(db, ROLES_COL, email.toLowerCase()));
}
