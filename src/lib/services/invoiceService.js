import { db } from '@/lib/firebase/config';
import { collection, doc, writeBatch, increment } from 'firebase/firestore';

export const invoiceService = {
  
  async generateInternalTicket(cart, total, paymentMethod, discount) {
    const saleRef = doc(collection(db, 'sales'));
    const saleId = saleRef.id;
    const batch = writeBatch(db);

    // 1. Cabecera (Sale)
    batch.set(saleRef, {
      id: saleId,
      fecha: new Date().toISOString(),
      total,
      descuento: discount,
      metodoPago: paymentMethod, 
      estadoPago: paymentMethod === 'MERCADO_PAGO' ? 'PENDIENTE' : 'COMPLETADO',
      tipoComprobante: 'TICKET_INTERNO',
      cae: null // Sin Arca
    });

    // 2. Detalle y Movimientos
    cart.forEach(item => {
      // Registrar Venta particular (Detalle)
      const itemRef = doc(collection(db, `sales/${saleId}/items`));
      batch.set(itemRef, {
        productId: item.product.id,
        nombre: item.product.nombre,
        cantidad: item.qty,
        precioUnitario: item.product.precio
      });

      // Descontar inventario central únicamente si el producto administra stock en unidades
      if (item.product.tipo !== 'granel' && item.product.stock !== null) {
        const prodRef = doc(db, 'products', item.product.id);
        batch.update(prodRef, {
          stock: increment(-item.qty)
        });
      }

      // Historial Inmutable de movimientos de Stock
      const movRef = doc(collection(db, 'stockMovements'));
      batch.set(movRef, {
        productId: item.product.id,
        tipo: 'VENTA_POS',
        cantidad: -item.qty,
        fecha: new Date().toISOString(),
        saleId: saleId
      });
    });

    try {
      await batch.commit();
      return { success: true, saleId };
    } catch (e) {
      console.error("Error confirmando ticket transaccional", e);
      throw e;
    }
  },

  async generateAFIPInvoice(cart, total, paymentMethod, discount) {
    /* 
      TODO: Implementación Real AFIP WebServices.
      Se enviará la petición POST a un endpoint /api/afip donde node-afip (server-side)
      sacará el CAE y devolverá la validación.
      Por ahora reusaremos la lógica y emularemos la salida Fiscal.
    */
    
    // Simulación de llamada API
    const authCae = Math.floor(Math.random() * 90000000000000) + 10000000000000;
    
    // Llamada simulada a la lógica interna de guardado:
    const data = await this.generateInternalTicket(cart, total, paymentMethod, discount);
    
    // Actualizamos con Datos Fiscales emulados
    const batch = writeBatch(db);
    batch.update(doc(db, 'sales', data.saleId), {
       tipoComprobante: 'FACTURA_B',
       cae: authCae.toString()
    });
    await batch.commit();

    return { success: true, saleId: data.saleId, cae: authCae };
  }
};
