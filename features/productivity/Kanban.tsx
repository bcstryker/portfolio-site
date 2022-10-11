import { FC } from "react";
import { DragDropContext, Droppable, Draggable, DropResult } from "react-beautiful-dnd";
import { KanbanCols, SetFunction } from "types";
import { PlusIcon, XIcon } from "@heroicons/react/solid"; //use x icon for delete card function
import { v4 as uuid } from "uuid";
import { useAppDispatch, AppDispatch } from "store";
import { UserActions } from "store/user";
// import {useSelector} from "react-redux";

const Kanban: FC<{ cols: KanbanCols; setCols: SetFunction }> = ({ cols, setCols }) => {
  const dispatch = useAppDispatch();

  return (
    <div className="w-full flex justify-evenly rounded-xl border">
      <DragDropContext onDragEnd={(result) => onDragEnd(result, cols, setCols, dispatch)}>
        {Object.entries(cols).map(([colId, col]) => (
          <div key={col.name} className="w-1/4 px-4 py-8">
            <div className="flex justify-between">
              <h2>{col.name}</h2>
              <PlusIcon
                className="h-4 w-4 cursor-pointer"
                onClick={() => addCard(cols, setCols, colId, dispatch)}
              />
            </div>
            <Droppable key={colId} droppableId={colId}>
              {(provided, snapshot) => (
                <div
                  className="rounded-xl border border-foreground-alt-300 bg-background-light p-6"
                  {...provided.droppableProps}
                  ref={provided.innerRef}
                  style={{
                    backgroundColor: snapshot.isDraggingOver
                      ? "rgb(var(--color-foreground-alt-400))"
                      : "rgb(var(--color-background-light))",
                  }}
                >
                  {col.items.map(
                    (item, index) =>
                      item &&
                      item.id && (
                        <Draggable key={item.id} draggableId={item.id} index={index}>
                          {(provided, snapshot) => (
                            <div
                              className="rounded-xl"
                              ref={provided.innerRef}
                              {...provided.draggableProps}
                              {...provided.dragHandleProps}
                              style={{
                                userSelect: "none",
                                padding: 16,
                                margin: "0 0 8px 0",
                                minHeight: "50px",
                                backgroundColor: snapshot.isDragging
                                  ? "rgb(var(--color-foreground-alt-300))"
                                  : "rgb(var(--color-foreground-alt-400))",
                                color: "rgb(var(--color-foreground-alt-100))",
                                ...provided.draggableProps.style,
                              }}
                            >
                              <p
                                id={item.id}
                                contentEditable="true"
                                onChange={() => editCard(colId, item.id, cols, setCols, dispatch)}
                                onBlur={() => editCard(colId, item.id, cols, setCols, dispatch)}
                                className="cursor-text focus:outline-none whitespace-pre-wrap"
                              >
                                {item.content}
                              </p>
                            </div>
                          )}
                        </Draggable>
                      ),
                  )}
                  {provided.placeholder}
                </div>
              )}
            </Droppable>
          </div>
        ))}
      </DragDropContext>
    </div>
  );
};

const onDragEnd = (
  result: DropResult,
  cols: KanbanCols,
  setCols: SetFunction,
  dispatch: AppDispatch,
) => {
  console.log(result);
  if (!result.destination) return;
  const { source, destination } = result;
  if (source.droppableId !== destination.droppableId) {
    const sourceCol = cols[source.droppableId];
    const destCol = cols[destination.droppableId];
    const sourceItems = [...sourceCol.items];
    const destItems = [...destCol.items];
    const [removed] = sourceItems.splice(source.index, 1);
    destItems.splice(destination.index, 0, removed);
    console.log(destItems);
    setCols((old: KanbanCols) => {
      return {
        ...old,
        [source.droppableId]: {
          ...sourceCol,
          items: sourceItems,
        },
        [destination.droppableId]: {
          ...destCol,
          items: destItems,
        },
      };
    });
    dispatch(UserActions.moveCard({ cols: cols, source: source, destination: destination }));
  } else {
    const col = cols[source.droppableId];
    const copiedItems = [...col.items];
    const [removed] = copiedItems.splice(source.index, 1);
    copiedItems.splice(destination.index, 0, removed);
    setCols({
      ...cols,
      [source.droppableId]: {
        ...col,
        items: copiedItems,
      },
    });
    // TODO add dispatch call to reorganize cols in user store
  }
};

const addCard = (cols: KanbanCols, setCols: SetFunction, id: string, dispatch: AppDispatch) => {
  const col = cols[id];
  const copiedItems = [...col.items];
  const newTask = { id: uuid(), content: "New Task." };
  const newCols: KanbanCols = {
    ...cols,
    [id]: {
      ...col,
      items: [...copiedItems, newTask],
    },
  };
  setCols(newCols);
  dispatch(UserActions.addCard({ colId: id, newCard: newTask }));
};

const editCard = (
  colId: string,
  itemId: string,
  cols: KanbanCols,
  setCols: SetFunction,
  dispatch: AppDispatch,
) => {
  const text = document.getElementById(itemId)?.innerText;
  const col = cols[colId];
  const copiedItems = col ? [...col.items] : [];
  for (let n = 0; n < copiedItems.length; n++)
    if (copiedItems[n].id === itemId) {
      copiedItems[n] = { ...copiedItems[n], content: text || "" };
    }
  dispatch(UserActions.editCard({ colId: colId, items: copiedItems }));

  setCols({
    ...cols,
    [colId]: {
      ...col,
      items: copiedItems,
    },
  });
};

export default Kanban;
