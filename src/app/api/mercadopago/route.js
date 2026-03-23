import { NextResponse } from 'next/server';
import { MercadoPagoConfig, Preference } from 'mercadopago';

const mpToken = process.env.MP_ACCESS_TOKEN || 'TEST-00000';
const client = new MercadoPagoConfig({ accessToken: mpToken });

export async function POST(req) {
  try {
    const { items, saleId } = await req.json();
    const preference = new Preference(client);
    
    // Parsear ítems al SDK
    const mpItems = items.map(c => ({
      id: c.product.id,
      title: c.product.nombre,
      quantity: Math.ceil(c.qty), // MP acepta ints, a granel se debe cobrar como item genérico, este es el MVP seguro.
      unit_price: c.product.precio,
      currency_id: 'ARS'
    }));

    const body = {
      items: mpItems,
      external_reference: saleId, 
      back_urls: {
        success: `${process.env.NEXT_PUBLIC_SITE_URL}/pos?mp=success`,
        failure: `${process.env.NEXT_PUBLIC_SITE_URL}/pos?mp=failure`,
        pending: `${process.env.NEXT_PUBLIC_SITE_URL}/pos?mp=pending`
      },
      auto_return: "approved",
    };

    const response = await preference.create({ body });
    return NextResponse.json({ init_point: response.init_point });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
