
export interface BoundingBox {
    x1: number;
    y1: number;
    x2: number;
    y2: number;
}

export interface GroundingSource {
    uri: string;
    title: string;
}

export interface IdentifiedItem {
  item: string;
  summary: string;
  description: string;
  marketValue: string;
  quickSalePrice: string;
  isHighValue: boolean;
  buyRecommendation: string;
  saleSpeed: string;
  boundingBox: BoundingBox;
  sources?: GroundingSource[];
}

export interface ChatMessage {
  role: 'user' | 'model';
  text: string;
}

export interface CropRegion {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface SavedItem {
    id: string;
    item: string;
    marketValue: string;
}
