import { NextResponse } from 'next/server';
import { adminAuth, adminDb } from '@/lib/firebase/admin';

// Reutilizamos verificación estricta de token Admin
async function verifyAdmin(request) {
  const authHeader = request.headers.get('authorization');
  if (!authHeader?.startsWith('Bearer ')) throw new Error('No token valid provided');
  
  const idToken = authHeader.split('Bearer ')[1];
  const decodedToken = await adminAuth.verifyIdToken(idToken);
  
  const userDoc = await adminDb.collection('users').doc(decodedToken.uid).get();
  if (!userDoc.exists || userDoc.data().rol !== 'admin' || !userDoc.data().activo) {
    throw new Error('No autorizado: Se requiere rol de Admin Activo');
  }
  return decodedToken.uid;
}

// CREAR USUARIO
export async function POST(req) {
  try {
    await verifyAdmin(req);
    const body = await req.json();
    const { email, password, rol } = body;

    // Crea al usuario silenciosamente desde Firebase Admin
    const userRecord = await adminAuth.createUser({ email, password });

    // Guardar Firestore model
    await adminDb.collection('users').doc(userRecord.uid).set({
      uid: userRecord.uid,
      email: userRecord.email,
      rol: rol || 'cajero',
      activo: true,
      createdAt: new Date().toISOString()
    });

    return NextResponse.json({ success: true, uid: userRecord.uid });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 403 });
  }
}

// EDITAR USUARIO (Rol, Estado Activo/Inactivo o Reset de Contraseña manual)
export async function PUT(req) {
  try {
    await verifyAdmin(req);
    const body = await req.json();
    const { targetUid, rol, activo, newPassword } = body;
    
    // Updates
    const updateData = {};
    if (rol !== undefined) updateData.rol = rol;
    if (activo !== undefined) updateData.activo = activo;

    if (Object.keys(updateData).length > 0) {
      await adminDb.collection('users').doc(targetUid).update(updateData);
    }
    
    // Force new password if provided directly
    if (newPassword) {
      await adminAuth.updateUser(targetUid, { password: newPassword });
    }

    // Disable in Auth completely aside from soft-delete, as extra security hook
    // Optional, based on your active flag sync:
    if (activo === false) {
      // revoke sessions
      await adminAuth.revokeRefreshTokens(targetUid);
      // Wait: user requested "Eliminación Lógica, campo activo: true/false. No borrar físicamente."
      // Disabling Auth token ensures immediate boot out alongside logic check in Context.
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 403 });
  }
}
