import { 
  collection, 
  doc, 
  getDoc,
  getDocs, 
  setDoc,
  addDoc, 
  updateDoc, 
  deleteDoc, 
  query, 
  where,
  writeBatch
} from 'firebase/firestore';
import { db } from './firebase';
import { Shop, ShopTransaction, AppUser, UserAccessStatus } from './types';

const SHOPS_COLLECTION = 'shops';
const TRANSACTIONS_COLLECTION = 'transactions';
const USER_ACCESS_COLLECTION = 'user_access';

// Normalizes email to doc id safe format
export function emailToDocId(email: string): string {
  return email.toLowerCase().trim().replace(/[^a-z0-9]/g, '_');
}

export async function fetchUserAccessRecord(email: string): Promise<AppUser | null> {
  const normEmail = email.toLowerCase().trim();
  const docId = emailToDocId(normEmail);
  const docRef = doc(db, USER_ACCESS_COLLECTION, docId);
  const snap = await getDoc(docRef);

  if (snap.exists()) {
    const data = snap.data();
    return {
      id: snap.id,
      uid: data.uid || '',
      email: data.email || normEmail,
      displayName: data.displayName || '',
      photoURL: data.photoURL || '',
      status: data.status || 'pending',
      can_edit: !!data.can_edit,
      request_note: data.request_note || '',
      requested_at: data.requested_at || 0,
      updated_at: data.updated_at || 0,
      approved_by: data.approved_by || '',
      edit_permitted_at: data.edit_permitted_at || undefined,
    };
  }

  // Also query in case doc id is different
  const q = query(collection(db, USER_ACCESS_COLLECTION), where('email', '==', normEmail));
  const querySnap = await getDocs(q);
  if (!querySnap.empty) {
    const foundDoc = querySnap.docs[0];
    const data = foundDoc.data();
    return {
      id: foundDoc.id,
      uid: data.uid || '',
      email: data.email || normEmail,
      displayName: data.displayName || '',
      photoURL: data.photoURL || '',
      status: data.status || 'pending',
      can_edit: !!data.can_edit,
      request_note: data.request_note || '',
      requested_at: data.requested_at || 0,
      updated_at: data.updated_at || 0,
      approved_by: data.approved_by || '',
      edit_permitted_at: data.edit_permitted_at || undefined,
    };
  }

  return null;
}

export async function requestUserAccess(userData: {
  email: string;
  uid?: string;
  displayName?: string;
  photoURL?: string;
  request_note?: string;
}): Promise<AppUser> {
  const normEmail = userData.email.toLowerCase().trim();
  const docId = emailToDocId(normEmail);
  const docRef = doc(db, USER_ACCESS_COLLECTION, docId);
  const now = Date.now();

  // If already exists, return existing or update uid
  const existing = await fetchUserAccessRecord(normEmail);
  if (existing) {
    if (userData.uid && !existing.uid) {
      await updateDoc(docRef, { uid: userData.uid, updated_at: now });
      existing.uid = userData.uid;
    }
    return existing;
  }

  const newRecord: AppUser = {
    id: docId,
    email: normEmail,
    uid: userData.uid || '',
    displayName: userData.displayName || '',
    photoURL: userData.photoURL || '',
    status: 'pending',
    can_edit: false,
    request_note: userData.request_note || '',
    requested_at: now,
    updated_at: now,
  };

  await setDoc(docRef, newRecord);
  return newRecord;
}

export async function fetchAllUserAccess(): Promise<AppUser[]> {
  const colRef = collection(db, USER_ACCESS_COLLECTION);
  const snap = await getDocs(colRef);
  const list: AppUser[] = [];
  snap.forEach((d) => {
    const data = d.data();
    list.push({
      id: d.id,
      uid: data.uid || '',
      email: data.email || '',
      displayName: data.displayName || '',
      photoURL: data.photoURL || '',
      status: (data.status as UserAccessStatus) || 'pending',
      can_edit: !!data.can_edit,
      request_note: data.request_note || '',
      requested_at: data.requested_at || 0,
      updated_at: data.updated_at || 0,
      approved_by: data.approved_by || '',
      edit_permitted_at: data.edit_permitted_at || undefined,
    });
  });

  return list.sort((a, b) => b.requested_at - a.requested_at);
}

export async function setUserAccessStatus(
  docIdOrEmail: string,
  newStatus: UserAccessStatus,
  approvedBy?: string
): Promise<void> {
  const docId = docIdOrEmail.includes('@') ? emailToDocId(docIdOrEmail) : docIdOrEmail;
  const docRef = doc(db, USER_ACCESS_COLLECTION, docId);
  await updateDoc(docRef, {
    status: newStatus,
    updated_at: Date.now(),
    ...(approvedBy ? { approved_by: approvedBy } : {}),
  });
}

export async function setUserEditPermission(
  docIdOrEmail: string,
  canEdit: boolean,
  approvedBy?: string
): Promise<void> {
  const docId = docIdOrEmail.includes('@') ? emailToDocId(docIdOrEmail) : docIdOrEmail;
  const docRef = doc(db, USER_ACCESS_COLLECTION, docId);
  const now = Date.now();
  await updateDoc(docRef, {
    can_edit: canEdit,
    updated_at: now,
    ...(canEdit ? { edit_permitted_at: now } : {}),
    ...(approvedBy ? { approved_by: approvedBy } : {}),
  });
}

export async function deleteUserAccess(docIdOrEmail: string): Promise<void> {
  const docId = docIdOrEmail.includes('@') ? emailToDocId(docIdOrEmail) : docIdOrEmail;
  const docRef = doc(db, USER_ACCESS_COLLECTION, docId);
  await deleteDoc(docRef);
}

export async function directAddApprovedUser(
  email: string,
  approvedBy?: string,
  displayName?: string
): Promise<AppUser> {
  const normEmail = email.toLowerCase().trim();
  const docId = emailToDocId(normEmail);
  const docRef = doc(db, USER_ACCESS_COLLECTION, docId);
  const now = Date.now();

  const record: AppUser = {
    id: docId,
    email: normEmail,
    displayName: displayName || '',
    status: 'approved',
    requested_at: now,
    updated_at: now,
    approved_by: approvedBy || 'Admin',
  };

  await setDoc(docRef, record);
  return record;
}


export async function fetchShops(): Promise<Shop[]> {
  const colRef = collection(db, SHOPS_COLLECTION);
  const snapshot = await getDocs(colRef);

  if (snapshot.empty) {
    return [];
  }

  const shops: Shop[] = [];
  snapshot.forEach((docSnap) => {
    const data = docSnap.data();
    shops.push({
      id: docSnap.id,
      name: data.name || '',
      shop_number: data.shop_number || '',
      floor: data.floor || '',
      floor_locations: Array.isArray(data.floor_locations) ? data.floor_locations : undefined,
      phone: data.phone || '',
      logo: data.logo || '',
      notes: data.notes || '',
      tags: Array.isArray(data.tags) ? data.tags : undefined,
      created_at: data.created_at || 0,
      updated_at: data.updated_at || 0,
    });
  });

  return shops.sort((a, b) => a.name.localeCompare(b.name));
}

export async function createShop(data: Omit<Shop, 'id' | 'created_at' | 'updated_at'>): Promise<Shop> {
  const colRef = collection(db, SHOPS_COLLECTION);
  const now = Date.now();
  const payload: any = {
    name: data.name.trim(),
    shop_number: data.shop_number.trim(),
    floor: data.floor.trim(),
    phone: (data.phone || '').trim(),
    logo: data.logo || '',
    notes: (data.notes || '').trim(),
    tags: Array.isArray(data.tags) ? data.tags : [],
    created_at: now,
    updated_at: now,
  };
  if (data.floor_locations && data.floor_locations.length > 0) {
    payload.floor_locations = data.floor_locations;
  }

  const docRef = await addDoc(colRef, payload);

  return {
    id: docRef.id,
    name: data.name.trim(),
    shop_number: data.shop_number.trim(),
    floor: data.floor.trim(),
    floor_locations: data.floor_locations,
    phone: (data.phone || '').trim(),
    logo: data.logo || '',
    notes: (data.notes || '').trim(),
    tags: Array.isArray(data.tags) ? data.tags : [],
    created_at: now,
    updated_at: now,
  };
}

export async function updateShop(
  id: string, 
  data: Partial<Omit<Shop, 'id' | 'created_at'>>
): Promise<void> {
  const docRef = doc(db, SHOPS_COLLECTION, id);
  await updateDoc(docRef, {
    ...data,
    updated_at: Date.now(),
  });
}

export async function deleteShopWithTransactions(shopId: string): Promise<void> {
  // Delete shop doc
  const shopDocRef = doc(db, SHOPS_COLLECTION, shopId);
  await deleteDoc(shopDocRef);

  // Delete all linked transactions
  const q = query(collection(db, TRANSACTIONS_COLLECTION), where('shop_id', '==', shopId));
  const snap = await getDocs(q);
  if (!snap.empty) {
    const batch = writeBatch(db);
    snap.forEach((d) => {
      batch.delete(d.ref);
    });
    await batch.commit();
  }
}

export async function fetchTransactionsForShop(
  shopId: string, 
  userId?: string
): Promise<ShopTransaction[]> {
  // If userId is provided, filter by shop_id and user_id so users only see their own transactions
  const q = userId
    ? query(
        collection(db, TRANSACTIONS_COLLECTION),
        where('shop_id', '==', shopId),
        where('user_id', '==', userId)
      )
    : query(
        collection(db, TRANSACTIONS_COLLECTION),
        where('shop_id', '==', shopId)
      );

  const snap = await getDocs(q);
  const results: ShopTransaction[] = [];
  snap.forEach((docSnap) => {
    const data = docSnap.data();
    const items = Array.isArray(data.items)
      ? data.items.map((it: any) => ({
          product_name: it.product_name || '',
          quantity: Number(it.quantity) || 0,
          unit_price: Number(it.unit_price) || 0,
          total_price: Number(it.total_price) || 0,
        }))
      : undefined;

    results.push({
      id: docSnap.id,
      shop_id: data.shop_id,
      user_id: data.user_id || '',
      user_email: data.user_email || '',
      date: data.date,
      type: data.type,
      items: items,
      product_name: data.product_name || (items && items.length > 0 ? items.map(i => i.product_name).join(', ') : ''),
      quantity: Number(data.quantity) || (items ? items.reduce((sum, i) => sum + i.quantity, 0) : 0),
      unit_price: Number(data.unit_price) || 0,
      total_amount: Number(data.total_amount) || 0,
      notes: data.notes || '',
      created_at: data.created_at || 0,
    });
  });

  // Sort by date descending, then created_at descending
  return results.sort((a, b) => {
    if (a.date !== b.date) {
      return b.date.localeCompare(a.date);
    }
    return b.created_at - a.created_at;
  });
}

export async function createTransaction(
  data: Omit<ShopTransaction, 'id' | 'created_at'>
): Promise<ShopTransaction> {
  const now = Date.now();
  const payload: any = {
    shop_id: data.shop_id,
    user_id: data.user_id,
    user_email: data.user_email,
    date: data.date,
    type: data.type,
    product_name: data.product_name.trim(),
    quantity: data.quantity,
    unit_price: data.unit_price,
    total_amount: data.total_amount,
    notes: (data.notes || '').trim(),
    created_at: now,
  };

  if (data.items && data.items.length > 0) {
    payload.items = data.items.map(item => ({
      product_name: item.product_name.trim(),
      quantity: Number(item.quantity) || 0,
      unit_price: Number(item.unit_price) || 0,
      total_price: Number(item.total_price) || 0,
    }));
  }

  const docRef = await addDoc(collection(db, TRANSACTIONS_COLLECTION), payload);

  return {
    id: docRef.id,
    shop_id: data.shop_id,
    user_id: data.user_id,
    user_email: data.user_email,
    date: data.date,
    type: data.type,
    items: data.items,
    product_name: data.product_name.trim(),
    quantity: data.quantity,
    unit_price: data.unit_price,
    total_amount: data.total_amount,
    notes: (data.notes || '').trim(),
    created_at: now,
  };
}

export async function updateTransaction(
  id: string,
  data: Partial<Omit<ShopTransaction, 'id' | 'created_at'>>
): Promise<void> {
  const docRef = doc(db, TRANSACTIONS_COLLECTION, id);
  const updatePayload: any = { ...data };
  if (data.items) {
    updatePayload.items = data.items.map(item => ({
      product_name: item.product_name.trim(),
      quantity: Number(item.quantity) || 0,
      unit_price: Number(item.unit_price) || 0,
      total_price: Number(item.total_price) || 0,
    }));
  }
  await updateDoc(docRef, updatePayload);
}

export async function deleteTransaction(id: string): Promise<void> {
  const docRef = doc(db, TRANSACTIONS_COLLECTION, id);
  await deleteDoc(docRef);
}

export async function clearAllShopsAndTransactions(): Promise<void> {
  const shopsSnap = await getDocs(collection(db, SHOPS_COLLECTION));
  const txSnap = await getDocs(collection(db, TRANSACTIONS_COLLECTION));
  const batch = writeBatch(db);
  shopsSnap.forEach((d) => batch.delete(d.ref));
  txSnap.forEach((d) => batch.delete(d.ref));
  await batch.commit();
}

