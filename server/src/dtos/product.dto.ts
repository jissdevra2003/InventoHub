export interface createProductDto
{
    name:string;
    sku:string;
    description?:string;
    category?:string;
    unit?:string;
    barcode?:string;
    cost_price?:number;
    selling_price?: number;
  stock_quantity?: number;

  image_urls?: string[];
  //attributes are key-value pairs , e.g size:XL, color:blue
  // for electronics ,voltage:220V 
  attributes?: Record<string, any>;


}