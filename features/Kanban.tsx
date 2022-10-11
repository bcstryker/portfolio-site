import { FC, useState } from "react";
import {
  DragDropContext,
  Droppable,
  Draggable,
  DropResult,
  DroppableStateSnapshot,
  DraggableProvided,
  DroppableProvided,
  DraggableStateSnapshot,
} from "react-beautiful-dnd";
import { KanbanCard, KanbanCols, SetFunction } from "types";
import { PlusIcon, TrashIcon, PencilIcon } from "@heroicons/react/solid"; //use x icon for delete card function
import { v4 as uuid } from "uuid";
import { useAppDispatch, AppDispatch } from "store";
import { UserActions } from "store/user";
import { classNames } from "utils";
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
                <DroppableDiv provided={provided} snapshot={snapshot}>
                  <>
                    {col.items.map(
                      (item, index) =>
                        item &&
                        item.id && (
                          <Draggable key={item.id} draggableId={item.id} index={index}>
                            {(provided, snapshot) => (
                              <DraggableDiv provided={provided} snapshot={snapshot}>
                                <Card
                                  item={item}
                                  colId={colId}
                                  cols={cols}
                                  setCols={setCols}
                                  dispatch={dispatch}
                                />
                              </DraggableDiv>
                            )}
                          </Draggable>
                        ),
                    )}
                    {provided.placeholder}
                  </>
                </DroppableDiv>
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
  if (!result.destination) return;
  const { source, destination } = result;
  if (source.droppableId !== destination.droppableId) {
    const sourceCol = cols[source.droppableId];
    const destCol = cols[destination.droppableId];
    const sourceItems = [...sourceCol.items];
    const destItems = [...destCol.items];
    const [removed] = sourceItems.splice(source.index, 1);
    destItems.splice(destination.index, 0, removed);
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

const DroppableDiv: FC<{
  provided: DroppableProvided;
  snapshot: DroppableStateSnapshot;
  children: JSX.Element;
}> = ({ provided, snapshot, children }) => (
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
    {children}
  </div>
);

const DraggableDiv: FC<{
  provided: DraggableProvided;
  snapshot: DraggableStateSnapshot;
  children: JSX.Element;
}> = ({ provided, snapshot, children }) => (
  <div
    className={classNames(
      "rounded-xl px-4 pb-4 pt-1 text-foreground-alt-100 mb-3",
      snapshot.isDragging ? "bg-foreground-alt-300" : "bg-foreground-alt-400",
    )}
    ref={provided.innerRef}
    {...provided.draggableProps}
    {...provided.dragHandleProps}
    style={{ ...provided.draggableProps.style }}
  >
    {children}
  </div>
);

const Card: FC<{
  item: KanbanCard;
  colId: string;
  cols: KanbanCols;
  setCols: SetFunction;
  dispatch: AppDispatch;
}> = ({ item, colId, cols, setCols, dispatch }) => {
  const [openModal, setOpenModal] = useState(false);
  return (
    <>
      <div className="w-full flex justify-end">
        {/* TODO turn this elipsis into modal with options to edit or delete card */}
        <p
          onClick={() => {
            setOpenModal(true);
          }}
        >
          ...
        </p>
        {openModal && <OptionsModal />}
      </div>
      <p
        id={item.id}
        contentEditable="true"
        onChange={() => editCard(colId, item.id, cols, setCols, dispatch)}
        onBlur={() => editCard(colId, item.id, cols, setCols, dispatch)}
        className="cursor-text focus:outline-none whitespace-pre-wrap"
      >
        {item.content}
      </p>
    </>
  );
};

// TODO make this modal a real modal that works, should contain edit and delete functionality
const OptionsModal: FC = () => <div className="z-200 w-16 h-8 bg-background border border-white" />;

export default Kanban;
