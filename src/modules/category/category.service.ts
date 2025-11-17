import { Category, CategoryDocument } from "@/schemas/category.schema";
import {
  Injectable,
  NotFoundException,
  BadRequestException,
  InternalServerErrorException,
} from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model, isValidObjectId } from "mongoose";
import {
  CategoryQueryDto,
  CreateCategoryDto,
  UpdateCategoryDto,
} from "./dto/category.dto";
import { PaginationDto } from "@/dto/common/pagination.dto";

@Injectable()
export class CategoryService {
  constructor(
    @InjectModel(Category.name)
    private readonly categoryModel: Model<CategoryDocument>
  ) {}

  async create(dto: CreateCategoryDto): Promise<Category> {
    try {
      const exists = await this.categoryModel.findOne({
        $or: [{ name: dto.name }, { slug: dto.slug }],
      });

      if (exists) {
        throw new BadRequestException("Category name or slug already exists");
      }

      const newCategory = new this.categoryModel(dto);
      return await newCategory.save();
    } catch (error) {
      throw new InternalServerErrorException(error.message);
    }
  }

  async findAll(
    pagination: PaginationDto,
    query: CategoryQueryDto
  ){
    try {
      const { isActive, search } = query;
      const page = Number(pagination.page) || 1;
      const limit = Number(pagination.limit) || 10;

      const filter: any = {};

      // Filter by isActive
      if (isActive === "true") filter.isActive = true;
      if (isActive === "false") filter.isActive = false;

      // Search by name or slug
      if (search) {
        filter.$or = [
          { name: { $regex: search, $options: "i" } },
          { slug: { $regex: search, $options: "i" } },
        ];
      }
      const categories = await this.categoryModel
        .find(filter)
        .sort({ sortOrder: 1, createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .exec();

      const total = await this.categoryModel.countDocuments(filter);

      return {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
        data: categories,
      };
    } catch (error) {
      throw new InternalServerErrorException("Failed to fetch categories");
    }
  }

  async findOne(id: string): Promise<Category> {
    try {
      if (!isValidObjectId(id)) {
        throw new BadRequestException("Invalid category ID");
      }

      const category = await this.categoryModel.findById(id);

      if (!category) {
        throw new NotFoundException("Category not found");
      }

      return category;
    } catch (error) {
      throw new InternalServerErrorException(error.message);
    }
  }

  async update(id: string, dto: UpdateCategoryDto): Promise<Category> {
    try {
      if (!isValidObjectId(id)) {
        throw new BadRequestException("Invalid category ID");
      }

      const updated = await this.categoryModel.findByIdAndUpdate(id, dto, {
        new: true,
        runValidators: true,
      });

      if (!updated) {
        throw new NotFoundException("Category not found");
      }

      return updated;
    } catch (error) {
      throw new InternalServerErrorException(error.message);
    }
  }

  async remove(id: string): Promise<{ message: string }> {
    try {
      if (!isValidObjectId(id)) {
        throw new BadRequestException("Invalid category ID");
      }

      const deleted = await this.categoryModel.findByIdAndDelete(id);

      if (!deleted) {
        throw new NotFoundException("Category not found");
      }

      return { message: "Category deleted successfully" };
    } catch (error) {
      throw new InternalServerErrorException(error.message);
    }
  }

async updateCategoryStatus(
    id: string,
    isActive: boolean,
  ): Promise<{ message: string; data: CategoryDocument }> {
    try {
      // 1️⃣ Validate ID format
      if (!isValidObjectId(id)) {
        throw new BadRequestException('Invalid category ID format');
      }

      // 2️⃣ Find category
      const category = await this.categoryModel.findById(id);
      if (!category) {
        throw new NotFoundException('Category not found');
      }

      // 3️⃣ No change needed
      if (category.isActive === isActive) {
        return {
          message: `Category is already ${isActive ? 'active' : 'inactive'}`,
          data: category,
        };
      }

      // 4️⃣ Update status
      category.isActive = isActive;
      const updated = await category.save();

      return {
        message: `Category ${
          isActive ? 'activated' : 'deactivated'
        } successfully`,
        data: updated,
      };
    } catch (error) {
      if (
        error instanceof BadRequestException ||
        error instanceof NotFoundException
      ) {
        throw error;
      }

      throw new InternalServerErrorException(
        'Failed to update category status. Please try again later.',
      );
    }
  }
}
