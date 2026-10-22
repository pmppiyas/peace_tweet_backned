const create = async (_dto: any) => ({ message: 'Categories feature disabled' });

const findAll = async (_query: any) => ({
  data: [],
  meta: { page: 1, limit: 50, total: 0, totalPages: 0 },
});

const findOne = async (_idOrSlug: string) => null;

const update = async (_id: string, _dto: any) => ({ message: 'Categories feature disabled' });

const remove = async (_id: string) => ({ message: 'Categories feature disabled' });

export const categoriesServices = {
  create,
  findAll,
  findOne,
  update,
  remove,
};
