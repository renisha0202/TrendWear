export const products = [
  {
    id: 1,
    name: "The Signature Blazer",
    category: "TAILORED ESSENTIALS",
    price: 3499,
    rating: "4.9",
    badge: "BESTSELLER",
    collections: ["best-sellers", "everyday-essentials"],
    image:
      "https://images.unsplash.com/photo-1591047139829-d91aecb6caea?auto=format&fit=crop&w=700&q=85",
  },
  {
    id: 2,
    name: "Classic White Shirt",
    category: "EVERYDAY LUXURY",
    price: 1799,
    rating: "4.8",
    badge: "NEW",
    collections: ["new-arrivals", "everyday-essentials"],
    image:
      "https://images.unsplash.com/photo-1598554747436-c9293d6a588f?auto=format&fit=crop&w=700&q=85",
  },
  {
    id: 3,
    name: "Minimal Co-ord Set",
    category: "MODERN CLASSICS",
    price: 2799,
    rating: "4.7",
    badge: "",
    collections: ["new-arrivals", "everyday-essentials"],
    image:
      "https://images.unsplash.com/photo-1483985988355-763728e1935b?auto=format&fit=crop&w=700&q=85",
  },
  {
    id: 4,
    name: "Evening Black Dress",
    category: "OCCASION WEAR",
    price: 2999,
    rating: "4.9",
    badge: "",
    collections: ["occasion-wear", "best-sellers"],
    image:
      "https://images.unsplash.com/photo-1539008835657-9e8e9680c956?auto=format&fit=crop&w=700&q=85",
  },
];

export const collections = [
  {
    id: "new-arrivals",
    name: "New Arrivals",
    description: "Fresh perspectives for the season ahead.",
    image: products[1].image,
  },
  {
    id: "best-sellers",
    name: "Best Sellers",
    description: "The pieces our community returns to.",
    image: products[0].image,
  },
  {
    id: "everyday-essentials",
    name: "Everyday Essentials",
    description: "Considered staples, made to live in.",
    image: products[2].image,
  },
  {
    id: "occasion-wear",
    name: "Occasion Wear",
    description: "Thoughtful finishing touches for your moments.",
    image: products[3].image,
  },
];