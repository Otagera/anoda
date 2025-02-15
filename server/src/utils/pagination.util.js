const paginationAbstract = async (model, { _page, _limit, filter }) => {
  const page = parseInt(_page, 10) || 1;
  const limit = parseInt(_limit, 10) || 25;
  const startIndex = (page - 1) * limit;
  const endIndex = page * limit;
  const total = await model.countDocuments();

  const pagination = {};
  if (endIndex < total) {
    pagination.next = {
      page: page + 1,
      limit,
    };
  }
  if (startIndex > 0) {
    pagination.prev = {
      page: page - 1,
      limit,
    };
  }

  const data = await model.find(filter, null, {
    skip: startIndex,
    limit,
  });
  return { pagination, count: data.length, data };
};
module.exports = paginationAbstract;
