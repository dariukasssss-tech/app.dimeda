import { useTranslation } from "@/contexts/TranslationContext";
import { MapPin, Package } from "lucide-react";

/**
 * Product info display component
 */
export const ProductInfo = ({ product, compact = false }) => {
  const { t } = useTranslation();
  
  if (!product) {
    return <span className="text-slate-400">{t("common.noData")}</span>;
  }

  if (compact) {
    return (
      <span className="text-sm text-slate-500">
        S/N: {product.serial_number} • {product.city}
      </span>
    );
  }

  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center gap-2">
        <Package size={14} className="text-slate-400" />
        <span className="font-medium">{product.serial_number}</span>
      </div>
      <div className="flex items-center gap-2 text-sm text-slate-500">
        <MapPin size={14} />
        <span>{product.city}</span>
        {product.model_name && <span>• {product.model_name}</span>}
      </div>
    </div>
  );
};

/**
 * Product selector with city filter
 */
export const ProductDisplay = ({ productId, products, showCity = true }) => {
  const { t } = useTranslation();
  
  const product = products?.find(p => p.id === productId);
  
  if (!product) {
    return <span className="text-slate-400">{t("common.noData")}</span>;
  }

  return (
    <span className="text-sm text-slate-500">
      S/N: {product.serial_number}
      {showCity && ` • ${product.city}`}
    </span>
  );
};

/**
 * Get product serial number helper
 */
export const getProductSerial = (productId, products) => {
  const product = products?.find(p => p.id === productId);
  return product?.serial_number || "N/A";
};

/**
 * Get product city helper
 */
export const getProductCity = (productId, products) => {
  const product = products?.find(p => p.id === productId);
  return product?.city || "N/A";
};

/**
 * Get full product object
 */
export const getProduct = (productId, products) => {
  return products?.find(p => p.id === productId) || null;
};

export default {
  ProductInfo,
  ProductDisplay,
  getProductSerial,
  getProductCity,
  getProduct,
};
