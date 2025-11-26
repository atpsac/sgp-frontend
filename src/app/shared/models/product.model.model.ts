export type ProductType = 'SIMPLE' | 'VARIABLE';

export interface ProductListItem {
  ProductoId: number;
  Slug: string;
  Nombre: string;
  Tipo: ProductType;
  Marca: string | null;
  Imagen: string | null;
  PrecioCaja: number | null;
  StockCaja: number;
  PrecioUnidad: number | null;
  StockUnidad: number;
  PriceMin: number | null;
  StockDisp: number;
  PrecioRangoTexto: string | null;
}

export interface ProductQuery {
  page?: number;
  pageSize?: number;
  q?: string;
  sort?: 'relevance' | 'price_asc' | 'price_desc' | 'newest';
  brand?: string;
  category?: string;
  inStock?: '' | '1'; // '' = todos, '1' = solo con stock
}

export interface ProductListResponse {
  data: ProductListItem[];
  pagination: {
    currentPage: number;
    pageSize: number;
    totalPages: number;
    totalRecords: number;
  };
}
