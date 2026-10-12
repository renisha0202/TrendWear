import { Category } from "../models/Category.js";
import { ApiError } from "../utils/ApiError.js";

export async function listCategories(request, response) {
  const kind = request.query.kind || "category";
  if (!["category", "collection"].includes(kind)) {
    throw new ApiError(400, "Kind must be category or collection.");
  }
  const categories = await Category.find({ kind }).sort({ name: 1 }).lean();
  response.json({ data: categories.map((item) => ({ ...item, id: item._id.toString() })) });
}
